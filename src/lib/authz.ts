import "server-only";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function commaSeparatedEnv(name: string) {
  return (process.env[name] ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  return commaSeparatedEnv("ADMIN_EMAILS").includes(normalizeEmail(email));
}

export function isAllowedGoogleEmail(email: string | null | undefined) {
  if (!email) return false;
  const domains = commaSeparatedEnv("ALLOWED_EMAIL_DOMAINS");
  if (!domains.length) return true;
  const domain = normalizeEmail(email).split("@").at(1);
  return Boolean(domain && domains.includes(domain));
}
