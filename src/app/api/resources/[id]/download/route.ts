import { Readable } from "node:stream";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/db";
import {
  downloadAudits,
  resourceFiles,
  resourcePermissions,
  resources,
} from "@/db/schema";
import { isAdminEmail } from "@/lib/authz";
import {
  contentDisposition,
  createArchiveDownloadUrl,
  openLocalArchive,
  type StoredArchive,
} from "@/lib/storage";
import { ensureAppUser } from "@/lib/users";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [record] = await getDb()
    .select({ resource: resources, file: resourceFiles })
    .from(resources)
    .innerJoin(resourceFiles, eq(resourceFiles.resourceId, resources.id))
    .where(eq(resources.id, id))
    .limit(1);

  if (!record) return Response.json({ error: "Resource not found." }, { status: 404 });

  const session = await auth();
  const admin = isAdminEmail(session?.user?.email);
  let appUser: Awaited<ReturnType<typeof ensureAppUser>> | null = null;

  if (session) appUser = await ensureAppUser(session);
  if (!admin && record.resource.status !== "published") {
    return Response.json({ error: "Resource not found." }, { status: 404 });
  }

  let allowed = admin || record.resource.accessLevel === "public";
  if (!allowed && appUser && record.resource.accessLevel === "authenticated") {
    allowed = true;
  }
  if (!allowed && appUser && record.resource.accessLevel === "restricted") {
    const [permission] = await getDb()
      .select({ id: resourcePermissions.id })
      .from(resourcePermissions)
      .where(
        and(
          eq(resourcePermissions.resourceId, record.resource.id),
          eq(resourcePermissions.userId, appUser.id),
          eq(resourcePermissions.canDownload, true),
          or(
            isNull(resourcePermissions.expiresAt),
            gt(resourcePermissions.expiresAt, new Date()),
          ),
        ),
      )
      .limit(1);
    allowed = Boolean(permission);
  }

  if (!allowed) {
    return Response.json(
      { error: session ? "You do not have download access." : "Authentication required." },
      { status: session ? 403 : 401 },
    );
  }

  await getDb().insert(downloadAudits).values({
    resourceId: record.resource.id,
    fileId: record.file.id,
    userId: appUser?.id ?? null,
    ipAddress:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip"),
    userAgent: request.headers.get("user-agent"),
  });

  const archive = {
    ...record.file,
    storageProvider: record.file.storageProvider as StoredArchive["storageProvider"],
  };
  const directDownloadUrl = await createArchiveDownloadUrl(archive);
  if (directDownloadUrl) {
    return Response.redirect(directDownloadUrl, 302);
  }

  const fileStream = await openLocalArchive(record.file.storageKey);

  return new Response(Readable.toWeb(fileStream) as ReadableStream, {
    headers: {
      "Content-Type": record.file.mimeType,
      "Content-Length": String(record.file.size),
      "Content-Disposition": contentDisposition(record.file.originalName),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
