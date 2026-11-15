import "server-only";

import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { mkdir, stat, unlink, writeFile } from "node:fs/promises";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { hashFileInWorker } from "@/lib/cpu-pool";

export type StorageProvider = "local" | "s3";

export type ArchiveMetadata = {
  originalName: string;
  mimeType: string;
  size: number;
  sha256: string;
};

export type StoredArchive = ArchiveMetadata & {
  storageProvider: StorageProvider;
  storageKey: string;
};

const ZIP_MIME_TYPES = new Set([
  "application/zip",
  "application/x-zip-compressed",
  "application/octet-stream",
]);

let s3Client: S3Client | undefined;

export function storageProvider(): StorageProvider {
  const configured = process.env.STORAGE_DRIVER?.trim().toLowerCase();
  if (configured && configured !== "local" && configured !== "s3") {
    throw new Error("STORAGE_DRIVER must be either local or s3.");
  }
  return (configured || (process.env.S3_BUCKET ? "s3" : "local")) as StorageProvider;
}

function maxArchiveBytes() {
  const parsed = Number(process.env.MAX_ARCHIVE_SIZE_MB ?? "500");
  const megabytes = Number.isFinite(parsed) && parsed > 0 ? parsed : 500;
  return megabytes * 1024 * 1024;
}

export function validateArchiveMetadata(metadata: ArchiveMetadata) {
  if (
    !metadata.originalName.toLowerCase().endsWith(".zip") ||
    (metadata.mimeType && !ZIP_MIME_TYPES.has(metadata.mimeType))
  ) {
    throw new Error("Archive must be a ZIP file.");
  }
  if (!Number.isSafeInteger(metadata.size) || metadata.size < 1 || metadata.size > maxArchiveBytes()) {
    throw new Error(`Archive must be smaller than ${process.env.MAX_ARCHIVE_SIZE_MB ?? "500"} MB.`);
  }
  if (!/^[a-f0-9]{64}$/i.test(metadata.sha256)) {
    throw new Error("Archive SHA-256 is invalid.");
  }
}

function localUploadRoot() {
  const configured = process.env.UPLOAD_DIR?.trim();
  if (configured) {
    if (!isAbsolute(configured)) throw new Error("UPLOAD_DIR must be an absolute path.");
    return resolve(/* turbopackIgnore: true */ configured);
  }
  return join(process.cwd(), ".data", "uploads");
}

function resolveLocalPath(storageKey: string) {
  const root = localUploadRoot();
  const absolutePath = resolve(root, storageKey);
  const relativePath = relative(root, absolutePath);
  if (!relativePath || relativePath.startsWith("..") || isAbsolute(relativePath)) {
    throw new Error("Invalid storage key.");
  }
  return absolutePath;
}

function s3Config() {
  const bucket = process.env.S3_BUCKET?.trim();
  if (!bucket) throw new Error("S3_BUCKET is required when STORAGE_DRIVER=s3.");
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim();
  if (Boolean(accessKeyId) !== Boolean(secretAccessKey)) {
    throw new Error("Set both S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY.");
  }
  return {
    bucket,
    region: process.env.S3_REGION?.trim() || "auto",
    endpoint: process.env.S3_ENDPOINT?.trim() || undefined,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials:
      accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined,
  };
}

function getS3Client() {
  if (s3Client) return s3Client;
  const config = s3Config();
  s3Client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    credentials: config.credentials,
  });
  return s3Client;
}

function newStorageKey() {
  return `archives/${new Date().getUTCFullYear()}/${randomUUID()}.zip`;
}

function validateStorageKey(provider: StorageProvider, storageKey: string) {
  const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
  const pattern = new RegExp(
    provider === "s3"
      ? `^archives/\\d{4}/${uuid}\\.zip$`
      : `^\\d{4}/${uuid}\\.zip$`,
    "i",
  );
  if (!pattern.test(storageKey)) throw new Error("Invalid storage key.");
}

export async function createDirectUpload(metadata: ArchiveMetadata) {
  validateArchiveMetadata(metadata);
  if (storageProvider() !== "s3") return null;

  const config = s3Config();
  const storageKey = newStorageKey();
  const checksum = Buffer.from(metadata.sha256, "hex").toString("base64");
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: storageKey,
    ContentType: "application/zip",
    ChecksumSHA256: checksum,
  });
  const uploadUrl = await getSignedUrl(getS3Client(), command, {
    expiresIn: 5 * 60,
    signableHeaders: new Set(["content-type"]),
    unhoistableHeaders: new Set(["x-amz-checksum-sha256"]),
  });

  return {
    archive: {
      ...metadata,
      mimeType: "application/zip",
      storageProvider: "s3" as const,
      storageKey,
    },
    uploadUrl,
    headers: {
      "Content-Type": "application/zip",
      "x-amz-checksum-sha256": checksum,
    },
  };
}

export async function saveLocalArchive(file: File, sha256: string): Promise<StoredArchive> {
  const metadata: ArchiveMetadata = {
    originalName: file.name.trim(),
    mimeType: file.type || "application/zip",
    size: file.size,
    sha256,
  };
  validateArchiveMetadata(metadata);

  const storageKey = `${new Date().getUTCFullYear()}/${randomUUID()}.zip`;
  const absolutePath = resolveLocalPath(storageKey);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, Buffer.from(await file.arrayBuffer()), { flag: "wx" });
  const actualSha256 = await hashFileInWorker(absolutePath);
  if (actualSha256 !== sha256.toLowerCase()) {
    await unlink(absolutePath).catch(() => undefined);
    throw new Error("Archive checksum verification failed.");
  }

  return {
    ...metadata,
    mimeType: "application/zip",
    storageProvider: "local",
    storageKey,
  };
}

export async function verifyArchive(archive: StoredArchive) {
  validateArchiveMetadata(archive);
  validateStorageKey(archive.storageProvider, archive.storageKey);
  if (archive.storageProvider === "local") {
    const fileStats = await stat(/* turbopackIgnore: true */ resolveLocalPath(archive.storageKey));
    if (fileStats.size !== archive.size) throw new Error("Uploaded archive size does not match.");
    return;
  }

  const config = s3Config();
  const result = await getS3Client().send(
    new HeadObjectCommand({ Bucket: config.bucket, Key: archive.storageKey }),
  );
  if (result.ContentLength !== archive.size) {
    throw new Error("Uploaded archive size does not match.");
  }
}

export async function createArchiveDownloadUrl(archive: StoredArchive) {
  if (archive.storageProvider !== "s3") return null;
  validateStorageKey(archive.storageProvider, archive.storageKey);
  const config = s3Config();
  return getSignedUrl(
    getS3Client(),
    new GetObjectCommand({
      Bucket: config.bucket,
      Key: archive.storageKey,
      ResponseContentType: archive.mimeType,
      ResponseContentDisposition: contentDisposition(archive.originalName),
    }),
    { expiresIn: 60 },
  );
}

export async function removeArchive(archive: Pick<StoredArchive, "storageProvider" | "storageKey">) {
  validateStorageKey(archive.storageProvider, archive.storageKey);
  if (archive.storageProvider === "local") {
    await unlink(resolveLocalPath(archive.storageKey)).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
    return;
  }
  const config = s3Config();
  await getS3Client().send(
    new DeleteObjectCommand({ Bucket: config.bucket, Key: archive.storageKey }),
  );
}

export async function openLocalArchive(storageKey: string) {
  const absolutePath = resolveLocalPath(storageKey);
  await stat(/* turbopackIgnore: true */ absolutePath);
  return createReadStream(/* turbopackIgnore: true */ absolutePath);
}

export function contentDisposition(filename: string) {
  const ascii = filename.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
