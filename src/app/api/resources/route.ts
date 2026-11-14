import { randomBytes } from "node:crypto";
import { z } from "zod";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { resourceFiles, resourcePreviews, resources } from "@/db/schema";
import { isAdminEmail } from "@/lib/authz";
import {
  removeArchive,
  type StoredArchive,
  verifyArchive,
} from "@/lib/storage";
import { ensureAppUser } from "@/lib/users";

export const runtime = "nodejs";

const pixhostUrl = z.string().url().refine((value) => {
  try {
    const hostname = new URL(value).hostname;
    return hostname === "pixhost.to" || hostname.endsWith(".pixhost.to");
  } catch {
    return false;
  }
}, "Preview URL must be hosted by Pixhost.");

const payloadSchema = z.object({
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(5_000).optional(),
  version: z.string().trim().max(40).optional(),
  status: z.enum(["draft", "published"]).default("draft"),
  accessLevel: z
    .enum(["public", "authenticated", "restricted"])
    .default("restricted"),
  archive: z.object({
    storageProvider: z.enum(["local", "s3"]),
    storageKey: z.string().min(1).max(500),
    originalName: z.string().trim().min(1).max(255),
    mimeType: z.literal("application/zip"),
    size: z.number().int().positive(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/i),
  }),
  previews: z
    .array(
      z.object({
        name: z.string().trim().max(255),
        imageUrl: pixhostUrl,
        backupUrl: pixhostUrl.nullable(),
        thumbUrl: pixhostUrl.nullable(),
      }),
    )
    .max(8)
    .default([]),
});

function slugify(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 190);
  return `${normalized || "resource"}-${randomBytes(3).toString("hex")}`;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }
  if (!isAdminEmail(session.user.email)) {
    return Response.json({ error: "Administrator access required." }, { status: 403 });
  }

  let uploadedArchive: StoredArchive | null = null;
  try {
    const payload = payloadSchema.parse(await request.json());
    uploadedArchive = payload.archive;
    await verifyArchive(uploadedArchive);
    const appUser = await ensureAppUser(session);

    const resource = await getDb().transaction(async (transaction) => {
      const [created] = await transaction
        .insert(resources)
        .values({
          title: payload.title,
          slug: slugify(payload.title),
          description: payload.description || null,
          version: payload.version || null,
          status: payload.status,
          accessLevel: payload.accessLevel,
          createdById: appUser.id,
        })
        .returning();

      await transaction.insert(resourceFiles).values({
        resourceId: created.id,
        ...uploadedArchive!,
      });

      if (payload.previews.length) {
        await transaction.insert(resourcePreviews).values(
          payload.previews.map((preview, position) => ({
            resourceId: created.id,
            imageUrl: preview.imageUrl,
            backupUrl: preview.backupUrl,
            thumbUrl: preview.thumbUrl,
            altText: preview.name,
            position,
          })),
        );
      }
      return created;
    });

    return Response.json({ resource }, { status: 201 });
  } catch (error) {
    if (uploadedArchive) await removeArchive(uploadedArchive).catch(() => undefined);
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Invalid resource metadata.", details: error.flatten() },
        { status: 400 },
      );
    }
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not create resource." },
      { status: 500 },
    );
  }
}
