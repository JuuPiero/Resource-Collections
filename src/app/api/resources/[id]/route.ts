import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { resourceFiles, resources } from "@/db/schema";
import { isAdminEmail } from "@/lib/authz";
import { removeArchive } from "@/lib/storage";

export const runtime = "nodejs";

const resourceIdSchema = z.string().uuid();

const updateSchema = z.object({
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(5_000).nullable(),
  version: z.string().trim().max(40).nullable(),
  category: z.enum(["3d", "2d", "audio", "tools", "templates", "addons", "other"]),
  status: z.enum(["draft", "published", "archived"]),
  accessLevel: z.enum(["public", "authenticated", "restricted"]),
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
    const [resource] = await getDb()
      .update(resources)
      .set({
        ...payload,
        description: payload.description || null,
        version: payload.version || null,
        updatedAt: new Date(),
      })
      .where(eq(resources.id, id))
      .returning();

    if (!resource) {
      return Response.json({ error: "Resource not found." }, { status: 404 });
    }
    return Response.json({ resource });
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
