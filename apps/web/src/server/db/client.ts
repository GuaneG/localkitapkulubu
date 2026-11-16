import "server-only";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

export type Database = ReturnType<typeof drizzle>;
let database: ReturnType<typeof drizzle<typeof schema>> | undefined;
let limiter: Pool | undefined;

export function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required for admin requests.");
  return url;
}

export function getDb() {
  return database ??= drizzle(new Pool({ connectionString: databaseUrl(), max: 4, connectionTimeoutMillis: 3000, query_timeout: 10000 }), { schema });
}

export function getLimiterPool(): Pool {
  // Separate capacity: waiting limiter locks can never consume auth's connections.
  return limiter ??= new Pool({ connectionString: databaseUrl(), max: 4, connectionTimeoutMillis: 3000, query_timeout: 10000 });
}
