import "server-only";

import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { hashPassword } from "@/lib/passwords";
import { normalizeEmail } from "@/lib/authz";

const bootstrapCredentialsSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(12).max(128),
});

export async function ensureBootstrapAdmin() {
  const rawEmail = process.env.ADMIN_EMAIL?.trim() ?? "";
  const password = process.env.ADMIN_PASSWORD ?? "";
  if (!rawEmail && !password) return;

  const parsed = bootstrapCredentialsSchema.safeParse({
    email: rawEmail,
    password,
  });
  if (!parsed.success) {
    throw new Error(
      "Set both ADMIN_EMAIL and ADMIN_PASSWORD; the admin password must be 12-128 characters.",
    );
  }

  const email = normalizeEmail(parsed.data.email);
  const database = getDb();
  const [existing] = await database
    .select({
      id: users.id,
      passwordHash: users.passwordHash,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    if (existing.isActive && !existing.passwordHash) {
      const passwordHash = await hashPassword(parsed.data.password);
      await database
        .update(users)
        .set({ passwordHash, updatedAt: new Date() })
        .where(and(eq(users.id, existing.id), isNull(users.passwordHash)));
    }
    return;
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await database
    .insert(users)
    .values({ email, name: "Administrator", passwordHash })
    .onConflictDoNothing({ target: users.email });
}
