import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { isAdminEmail, isAllowedGoogleEmail } from "@/lib/authz";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    signIn({ account, profile }) {
      if (account?.provider !== "google") return false;
      const verified = profile?.email_verified === true;
      return verified && isAllowedGoogleEmail(profile?.email);
    },
    jwt({ token, profile }) {
      if (profile?.email) token.email = profile.email;
      token.role = isAdminEmail(token.email) ? "admin" : "member";
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = isAdminEmail(session.user.email) ? "admin" : "member";
      }
      return session;
    },
  },
});
