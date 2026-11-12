import { NextResponse } from "next/server";
import { getSql, isDatabaseConfigured } from "@/lib/db/neon";

export const runtime = "nodejs";

export async function GET() {
  const dbConfigured = isDatabaseConfigured();
  let dbConnected = false;

  if (dbConfigured) {
    try {
      const sql = getSql();
      await sql`SELECT 1 AS ok`;
      dbConnected = true;
    } catch {
      dbConnected = false;
    }
  }

  return NextResponse.json({
    ok: true,
    database: {
      provider: "neon",
      configured: dbConfigured,
      connected: dbConnected,
    },
    telegramConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim()),
  });
}
