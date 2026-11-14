import "server-only";

import type { Session } from "next-auth";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { normalizeEmail } from "@/lib/authz";

export type AppUser = typeof users.$inferSelect;

export async function ensureAppUser(session: Session): Promise<AppUser> {
  const email = session.user.email;
  if (!email) throw new Error("The signed-in account did not provide an email address.");

  const normalizedEmail = normalizeEmail(email);
  const now = new Date();
  const [user] = await getDb()
    .insert(users)
    .values({
      email: normalizedEmail,
      name: session.user.name,
      avatarUrl: session.user.image,
      lastLoginAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        name: session.user.name,
        avatarUrl: session.user.image,
        lastLoginAt: now,
        updatedAt: now,
      },
    })
    .returning();

  if (!user?.isActive) throw new Error("This account has been disabled.");
  return user;
}

export async function findUserByEmail(email: string) {
  const [user] = await getDb()
    .select()
    .from(users)
    .where(eq(users.email, normalizeEmail(email)))
    .limit(1);
  return user ?? null;
}
