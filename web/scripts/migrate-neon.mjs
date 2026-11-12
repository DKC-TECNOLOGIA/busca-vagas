import fs from "node:fs";
import path from "node:path";
import { Client, neonConfig } from "@neondatabase/serverless";

if (typeof globalThis.WebSocket === "function") {
  neonConfig.webSocketConstructor = globalThis.WebSocket;
}

const connectionString = process.env.DATABASE_URL?.trim();
if (!connectionString) {
  console.error("DATABASE_URL não definida. Execute com: node --env-file=.env.local scripts/migrate-neon.mjs");
  process.exit(1);
}

const migrationPath = path.resolve(process.cwd(), "db/migrations/001_initial_schema.sql");
const sql = fs.readFileSync(migrationPath, "utf8");

const client = new Client({ connectionString });
await client.connect();

try {
  await client.query(sql);
  const res = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
  );
  console.log(`Migration aplicada com sucesso. Tabelas (${res.rows.length}):`);
  for (const row of res.rows) {
    console.log(`- ${row.table_name}`);
  }
} finally {
  await client.end();
}
