import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { isAdminEmail } from "@/lib/authz";

export const runtime = "nodejs";

const userIdSchema = z.string().uuid();
const updateSchema = z.object({ isActive: z.boolean() });

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
    if (!userIdSchema.safeParse(id).success) {
      return Response.json({ error: "Invalid user ID." }, { status: 400 });
    }

    const { isActive } = updateSchema.parse(await request.json());
    const database = getDb();
    const [target] = await database
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    if (!target) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }
    if (isAdminEmail(target.email)) {
      return Response.json(
        { error: "Configured administrator accounts cannot be disabled here." },
        { status: 403 },
      );
    }

    const [updated] = await database
      .update(users)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        email: users.email,
        isActive: users.isActive,
        updatedAt: users.updatedAt,
      });

    return Response.json({ user: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Invalid user status." }, { status: 400 });
    }
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not update user." },
      { status: 500 },
    );
  }
}
