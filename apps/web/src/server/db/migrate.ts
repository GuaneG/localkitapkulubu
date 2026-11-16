import "server-only";
import { resolve } from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { Database } from "./client";

export async function migrateDatabase(db: Database) {
  await migrate(db, { migrationsFolder: resolve(import.meta.dirname, "../../../drizzle") });
}
