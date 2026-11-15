import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { resourceFiles, resourcePreviews, resources } from "@/db/schema";
import { isAdminEmail } from "@/lib/authz";
import {
  removeArchive,
  verifyArchive,
} from "@/lib/storage";

export const runtime = "nodejs";

const resourceIdSchema = z.string().uuid();
const pixhostUrl = z.string().url().refine((value) => {
  try {
    const hostname = new URL(value).hostname;
    return hostname === "pixhost.to" || hostname.endsWith(".pixhost.to");
  } catch {
    return false;
  }
}, "Preview URL must be hosted by Pixhost.");

const updateSchema = z.object({
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(5_000).nullable(),
  version: z.string().trim().max(40).nullable(),
  category: z.enum(["3d", "2d", "audio", "tools", "templates", "addons", "other"]),
  status: z.enum(["draft", "published", "archived"]),
  accessLevel: z.enum(["public", "authenticated", "restricted"]),
  archive: z
    .object({
      storageProvider: z.enum(["local", "s3"]),
      storageKey: z.string().min(1).max(500),
      originalName: z.string().trim().min(1).max(255),
      mimeType: z.literal("application/zip"),
      size: z.number().int().positive(),
      sha256: z.string().regex(/^[a-f0-9]{64}$/i),
    })
    .optional(),
  previews: z
    .array(
      z.object({
        name: z.string().trim().max(255),
        imageUrl: pixhostUrl,
        backupUrl: pixhostUrl.nullable(),
        thumbUrl: pixhostUrl.nullable(),
      }),
    )
    .min(1)
    .max(8)
    .optional(),
});

async function requireAdmin() {
  const session = await auth();
  return Boolean(session?.user?.email && isAdminEmail(session.user.email));
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Administrator access required." }, { status: 403 });
  }

  try {
    const { id } = await params;
    if (!resourceIdSchema.safeParse(id).success) {
      return Response.json({ error: "Invalid resource ID." }, { status: 400 });
    }
    const payload = updateSchema.parse(await request.json());
    if (payload.archive) {
      await verifyArchive(payload.archive);
    }

    const updated = await getDb().transaction(async (transaction) => {
      const [existing] = await transaction
        .select({ id: resources.id })
        .from(resources)
        .where(eq(resources.id, id))
        .limit(1);
      if (!existing) return null;

      const previousFiles = payload.archive
        ? await transaction
            .select()
            .from(resourceFiles)
            .where(eq(resourceFiles.resourceId, id))
        : [];
      if (payload.archive) {
        await transaction
          .delete(resourceFiles)
          .where(eq(resourceFiles.resourceId, id));
        await transaction.insert(resourceFiles).values({
          resourceId: id,
          ...payload.archive,
        });
      }
      if (payload.previews) {
        await transaction
          .delete(resourcePreviews)
          .where(eq(resourcePreviews.resourceId, id));
        await transaction.insert(resourcePreviews).values(
          payload.previews.map((preview, position) => ({
            resourceId: id,
            imageUrl: preview.imageUrl,
            backupUrl: preview.backupUrl,
            thumbUrl: preview.thumbUrl,
            altText: preview.name || null,
            position,
          })),
        );
      }

      const [resource] = await transaction
        .update(resources)
        .set({
          title: payload.title,
          description: payload.description || null,
          version: payload.version || null,
          category: payload.category,
          status: payload.status,
          accessLevel: payload.accessLevel,
          updatedAt: new Date(),
        })
        .where(eq(resources.id, id))
        .returning();

      return resource ? { resource, previousFiles } : null;
    });

    if (!updated) {
      return Response.json({ error: "Resource not found." }, { status: 404 });
    }

    const cleanupWarnings: string[] = [];
    for (const file of updated.previousFiles) {
      try {
        if (file.storageProvider !== "local" && file.storageProvider !== "s3") {
          throw new Error("Unknown archive storage provider.");
        }
        await removeArchive({
          storageProvider: file.storageProvider,
          storageKey: file.storageKey,
        });
      } catch (error) {
        cleanupWarnings.push(
          `${file.originalName}: ${error instanceof Error ? error.message : "unknown error"}`,
        );
      }
    }

    return Response.json({
      resource: updated.resource,
      ...(cleanupWarnings.length
        ? {
            warning: `Resource was updated, but replaced ZIP cleanup failed for: ${cleanupWarnings.join(", ")}.`,
          }
        : {}),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Invalid resource details.", details: error.flatten() },
        { status: 400 },
      );
    }
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not update resource." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Administrator access required." }, { status: 403 });
  }

  try {
    const { id } = await params;
    if (!resourceIdSchema.safeParse(id).success) {
      return Response.json({ error: "Invalid resource ID." }, { status: 400 });
    }

    const files = await getDb().transaction(async (transaction) => {
      const [existing] = await transaction
        .select({ id: resources.id })
        .from(resources)
        .where(eq(resources.id, id))
        .limit(1);
      if (!existing) return null;

      const storedFiles = await transaction
        .select()
        .from(resourceFiles)
        .where(eq(resourceFiles.resourceId, id));
      const [deleted] = await transaction
        .delete(resources)
        .where(eq(resources.id, id))
        .returning({ id: resources.id });
      return deleted ? storedFiles : null;
    });

    if (!files) {
      return Response.json({ error: "Resource not found." }, { status: 404 });
    }

    const cleanupWarnings: string[] = [];
    for (const file of files) {
      try {
        if (file.storageProvider !== "local" && file.storageProvider !== "s3") {
          throw new Error("Unknown archive storage provider.");
        }
        await removeArchive({
          storageProvider: file.storageProvider,
          storageKey: file.storageKey,
        });
      } catch (error) {
        cleanupWarnings.push(
          `${file.originalName}: ${error instanceof Error ? error.message : "unknown error"}`,
        );
      }
    }

    return Response.json({
      ok: true,
      ...(cleanupWarnings.length
        ? {
            warning: `Resource was deleted, but stored ZIP cleanup failed for: ${cleanupWarnings.join(", ")}.`,
          }
        : {}),
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not delete resource." },
      { status: 500 },
    );
  }
}
