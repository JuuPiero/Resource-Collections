import "server-only";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  const adminEmail = normalizeEmail(process.env.ADMIN_EMAIL ?? "");
  return Boolean(adminEmail && adminEmail === normalizeEmail(email));
}
