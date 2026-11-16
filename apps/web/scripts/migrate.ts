import { loadEnvConfig } from "@next/env";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrateDatabase } from "../src/server/db/migrate";

loadEnvConfig(process.cwd());
async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL gerekli.");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  try { await migrateDatabase(drizzle(pool)); console.log("Migration tamamlandı."); }
  finally { await pool.end(); }
}
main().catch(() => { console.error("Migration tamamlanamadı. Bağlantı ve şema izinlerini kontrol edin."); process.exitCode = 1; });
