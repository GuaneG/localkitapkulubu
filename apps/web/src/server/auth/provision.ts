import "server-only";
import { eq, sql } from "drizzle-orm";
import type { Database } from "../db/client";
import { siteAdmin, user } from "../db/schema";
import { createAuth, type AuthConfig } from "./auth";
import { loginEmail } from "./login-identity";

export async function provisionAdmin(db: Database, config: AuthConfig, rawEmail: string, password: string) {
  const email = loginEmail({ email: rawEmail, password });
  if (password.length < 12) throw new Error("Bootstrap password must have at least 12 characters.");
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(561191115)`);
    const [existing] = await tx.select({ email: user.email }).from(siteAdmin).innerJoin(user, eq(user.id, siteAdmin.userId));
    if (existing) {
      if (existing.email !== email) throw new Error("A different shared admin already exists.");
      return; // Never reset credentials on a repeated bootstrap.
    }
    const [partial] = await tx.select().from(user).where(eq(user.email, email));
    if (partial) throw new Error("Account exists without admin registration; inspect the interrupted bootstrap manually.");
    // This signup-capable instance is CLI-only and is never mounted on HTTP.
    const bootstrap = createAuth(tx as unknown as Database, config, true);
    const created = await bootstrap.api.signUpEmail({ body: { email, password, name: "LOCAL. ortak admin" }, headers: new Headers({ origin: config.origin }) });
    await tx.insert(siteAdmin).values({ singleton: 1, userId: created.user.id });
  });
}
