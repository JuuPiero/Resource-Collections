import "server-only";

import { z } from "zod";
import { normalizeEmail } from "@/lib/authz";

const adminCredentialsSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(12).max(128),
});

export function getAdminCredentials() {
  const parsed = adminCredentialsSchema.safeParse({
    email: normalizeEmail(process.env.ADMIN_EMAIL ?? ""),
    password: process.env.ADMIN_PASSWORD ?? "",
  });
  return parsed.success ? parsed.data : null;
}

export function getAdminConfigIssue() {
  const email = process.env.ADMIN_EMAIL?.trim() ?? "";
  const password = process.env.ADMIN_PASSWORD ?? "";
  if (!email || !password) {
    return "ADMIN_EMAIL or ADMIN_PASSWORD is missing on the server.";
  }
  if (!adminCredentialsSchema.safeParse({ email, password }).success) {
    return "ADMIN_EMAIL is invalid or ADMIN_PASSWORD must be 12-128 characters.";
  }
  if (!process.env.AUTH_SECRET) return "AUTH_SECRET is missing on the server.";
  return null;
}
