import { z } from "zod";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/authz";
import {
  createDirectUpload,
  removeArchive,
  saveLocalArchive,
  storageProvider,
} from "@/lib/storage";

export const runtime = "nodejs";

const metadataSchema = z.object({
  originalName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().max(120).default("application/zip"),
  size: z.number().int().positive(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/i),
});

const archiveSchema = metadataSchema.extend({
  storageProvider: z.enum(["local", "s3"]),
  storageKey: z.string().min(1).max(500),
  mimeType: z.literal("application/zip"),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }
  if (!isAdminEmail(session.user.email)) {
    return Response.json({ error: "Administrator access required." }, { status: 403 });
  }

  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const metadata = metadataSchema.parse(await request.json());
      const directUpload = await createDirectUpload(metadata);
      if (directUpload) {
        return Response.json({ strategy: "direct", ...directUpload });
      }
      return Response.json({
        strategy: "proxy",
        uploadUrl: "/api/uploads/archive",
        reason: "Local storage requires the ZIP to pass through this server.",
      });
    }

    if (storageProvider() !== "local") {
      return Response.json(
        { error: "Proxy upload is disabled when S3 storage is configured." },
        { status: 409 },
      );
    }
    const form = await request.formData();
    const archive = form.get("archive");
    const sha256 = form.get("sha256");
    if (!(archive instanceof File) || typeof sha256 !== "string") {
      return Response.json({ error: "Archive and SHA-256 are required." }, { status: 400 });
    }
    const storedArchive = await saveLocalArchive(archive, sha256);
    return Response.json({ archive: storedArchive }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Invalid archive metadata." }, { status: 400 });
    }
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not prepare upload." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return Response.json({ error: "Administrator access required." }, { status: 403 });
  }
  try {
    const archive = archiveSchema.parse(await request.json());
    await removeArchive(archive);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Invalid archive descriptor." }, { status: 400 });
    }
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not remove upload." },
      { status: 500 },
    );
  }
}
