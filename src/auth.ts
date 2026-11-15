import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { isAdminEmail, normalizeEmail } from "@/lib/authz";
import { verifyEnvironmentPassword, verifyPassword } from "@/lib/passwords";
import { getAdminCredentials } from "@/lib/admin-config";
import { z } from "zod";

const credentialsSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(1).max(128),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const submittedEmail = normalizeEmail(parsed.data.email);
        const adminCredentials = getAdminCredentials();

        if (isAdminEmail(submittedEmail)) {
          if (
            !adminCredentials ||
            !verifyEnvironmentPassword(
              parsed.data.password,
              adminCredentials.password,
            )
          ) {
            return null;
          }
          return {
            id: `admin:${submittedEmail}`,
            email: submittedEmail,
            name: "Administrator",
          };
        }

        const database = getDb();
        const [user] = await database
          .select({
            id: users.id,
            email: users.email,
            name: users.name,
            passwordHash: users.passwordHash,
            isActive: users.isActive,
          })
          .from(users)
          .where(eq(users.email, submittedEmail))
          .limit(1);

        if (
          !user ||
          !user.isActive ||
          !(await verifyPassword(parsed.data.password, user.passwordHash))
        ) {
          return null;
        }

        const now = new Date();
        await database
          .update(users)
          .set({ lastLoginAt: now, updatedAt: now })
          .where(eq(users.id, user.id));

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user?.email) token.email = user.email;
      if (user?.id) token.sub = user.id;
      token.role = isAdminEmail(token.email) ? "admin" : "member";
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = token.role ?? "member";
      }
      return session;
    },
  },
});
