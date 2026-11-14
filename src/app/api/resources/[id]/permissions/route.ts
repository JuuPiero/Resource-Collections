import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { resourcePermissions, resources, users } from "@/db/schema";
import { isAdminEmail, normalizeEmail } from "@/lib/authz";
import { ensureAppUser, findUserByEmail } from "@/lib/users";

const permissionSchema = z.object({
  email: z.string().trim().email().max(320),
  expiresAt: z.string().datetime().nullish(),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.email || !isAdminEmail(session.user.email)) return null;
  return { session, user: await ensureAppUser(session) };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Forbidden." }, { status: 403 });

  try {
    const { id } = await params;
    const data = permissionSchema.parse(await request.json());
    const [resource] = await getDb()
      .select({ id: resources.id })
      .from(resources)
      .where(eq(resources.id, id))
      .limit(1);
    if (!resource) return Response.json({ error: "Resource not found." }, { status: 404 });

    const targetUser = await findUserByEmail(data.email);
    if (!targetUser?.isActive || !targetUser.passwordHash) {
      return Response.json(
        { error: "The user must create an active account before access can be granted." },
        { status: 404 },
      );
    }
    const [permission] = await getDb()
      .insert(resourcePermissions)
      .values({
        resourceId: id,
        userId: targetUser.id,
        grantedById: admin.user.id,
        canDownload: true,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      })
      .onConflictDoUpdate({
        target: [resourcePermissions.resourceId, resourcePermissions.userId],
        set: {
          canDownload: true,
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
          grantedById: admin.user.id,
          updatedAt: new Date(),
        },
      })
      .returning();

    return Response.json({ permission, email: targetUser.email });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not grant access." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Forbidden." }, { status: 403 });

  try {
    const { id } = await params;
    const data = permissionSchema.pick({ email: true }).parse(await request.json());
    const [target] = await getDb()
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizeEmail(data.email)))
      .limit(1);
    if (target) {
      await getDb()
        .delete(resourcePermissions)
        .where(
          and(
            eq(resourcePermissions.resourceId, id),
            eq(resourcePermissions.userId, target.id),
          ),
        );
    }
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not revoke access." },
      { status: 500 },
    );
  }
}
