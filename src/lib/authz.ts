import "server-only";

export function normalizeEmail(email: string) {
  return email.trim().replace(/^["']|["']$/g, "").trim().toLowerCase();
}

export function isAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  const configured = [process.env.ADMIN_EMAIL, process.env.ADMIN_EMAILS]
    .filter((value): value is string => Boolean(value))
    .flatMap((value) => value.split(/[,;\n]/))
    .map(normalizeEmail)
    .filter(Boolean);
  return configured.includes(normalizeEmail(email));
}
