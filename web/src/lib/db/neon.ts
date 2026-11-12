import { neon } from "@neondatabase/serverless";

export function isDatabaseConfigured(): boolean {
  const url = process.env.DATABASE_URL?.trim() ?? "";
  return Boolean(
    url &&
      (url.startsWith("postgres://") || url.startsWith("postgresql://")) &&
      !url.includes("ep-seu-host.us-east-2.aws.neon.tech"),
  );
}

export function getSql() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url || !isDatabaseConfigured()) {
    throw new Error("DATABASE_URL do Neon não configurada. Defina DATABASE_URL em web/.env.local.");
  }
  return neon(url);
}
