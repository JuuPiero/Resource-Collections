import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { normalizeEmail } from "@/lib/authz";
import { hashPassword } from "@/lib/passwords";

export const runtime = "nodejs";

const registrationSchema = z.object({
  name: z.string().trim().min(1).max(160),
  email: z.string().trim().email().max(320),
  password: z.string().min(12).max(128),
});

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = registrationSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Enter a valid name, email, and password of at least 12 characters." },
      { status: 400 },
    );
  }

  const email = normalizeEmail(parsed.data.email);
  const bootstrapEmail = normalizeEmail(process.env.ADMIN_EMAIL ?? "");
  if (bootstrapEmail && email === bootstrapEmail) {
    return Response.json(
      { error: "This account is configured by the server. Sign in with its administrator credentials." },
      { status: 409 },
    );
  }

  try {
    const database = getDb();
    const passwordHash = await hashPassword(parsed.data.password);
    const [existing] = await database
      .select({
        id: users.id,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing) {
      return Response.json(
        { error: "An account with this email already exists. Sign in or contact an administrator." },
        { status: 409 },
      );
    }

    await database.insert(users).values({
      email,
      name: parsed.data.name,
      passwordHash,
    });
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return Response.json(
        { error: "An account with this email already exists. Sign in or contact an administrator." },
        { status: 409 },
      );
    }
    console.error("Account registration failed.", error);
    return Response.json({ error: "Could not create your account." }, { status: 500 });
  }
}
