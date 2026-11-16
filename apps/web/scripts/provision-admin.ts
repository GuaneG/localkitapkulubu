import { loadEnvConfig } from "@next/env";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { authConfig } from "../src/server/auth/auth";
import { provisionAdmin } from "../src/server/auth/provision";

loadEnvConfig(process.cwd());
async function main() {
  const { DATABASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!DATABASE_URL || !ADMIN_EMAIL || !ADMIN_PASSWORD) throw new Error("Bootstrap ayarları eksik.");
  const pool = new Pool({ connectionString: DATABASE_URL, max: 2 });
  try { await provisionAdmin(drizzle(pool), authConfig(), ADMIN_EMAIL, ADMIN_PASSWORD); console.log("Ortak admin hazır. Var olan parola değiştirilmedi."); }
  finally { await pool.end(); }
}
main().catch(() => { console.error("Admin hazırlanamadı. Migration, ortam ayarları ve mevcut hesap kaydını kontrol edin."); process.exitCode = 1; });
