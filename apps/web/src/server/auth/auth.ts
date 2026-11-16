import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";
import { getDb, type Database } from "../db/client";
import * as schema from "../db/schema";

export type AuthConfig = { origin: string; secret: string };
export function authConfig(): AuthConfig {
  const origin = process.env.BETTER_AUTH_URL;
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!origin || !secret || secret.length < 32) throw new Error("Admin auth configuration is missing.");
  const url = new URL(origin);
  if (url.origin !== origin || !["http:", "https:"].includes(url.protocol)) throw new Error("BETTER_AUTH_URL must be an origin.");
  return { origin, secret };
}

export function createAuth(db: Database, config: AuthConfig, bootstrap = false) {
  return betterAuth({
    baseURL: config.origin, secret: config.secret, trustedOrigins: [config.origin],
    database: drizzleAdapter(db, { provider: "pg", schema }),
    emailAndPassword: { enabled: true, disableSignUp: !bootstrap, autoSignIn: false },
    session: { expiresIn: 604800, disableSessionRefresh: true, cookieCache: { enabled: false } },
    rateLimit: { enabled: false }, // Actual login HTTP requests use the persistent failure limiter.
    logger: { disabled: true },
    advanced: { useSecureCookies: config.origin.startsWith("https:"), ipAddress: { disableIpTracking: true } },
    databaseHooks: { session: { create: { before: async (value) => {
      const [admin] = await db.select().from(schema.siteAdmin).where(eq(schema.siteAdmin.userId, value.userId));
      return admin ? { data: value } : false;
    } } } },
  });
}

let auth: ReturnType<typeof createAuth> | undefined;
export function getAuth() { return auth ??= createAuth(getDb(), authConfig()); }
