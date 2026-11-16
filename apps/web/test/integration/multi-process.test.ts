import assert from "node:assert/strict";
import { fork, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { test } from "node:test";
import { Pool } from "pg";
import { testDatabaseUrl } from "../helpers/database";

test("two independent HTTP processes share the five-failure ceiling without exhausting auth connections", { skip: !process.env.TEST_DATABASE_URL }, async () => {
  testDatabaseUrl();
  const children: ChildProcess[] = [];
  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
  try {
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { migrateDatabase } = await import("../../src/server/db/migrate");
    const { provisionAdmin } = await import("../../src/server/auth/provision");
    const db = drizzle(pool);
    await migrateDatabase(db);
    await pool.query("TRUNCATE site_admin, auth_session, auth_account, auth_user CASCADE");
    await provisionAdmin(db, { origin: "http://127.0.0.1:3000", secret: "integration-only-secret-with-more-than-32-characters" }, "po@example.com", "test-only-admin-password-2026");
    await pool.query("TRUNCATE login_failure");
    const origins: string[] = [];
    for (let i = 0; i < 2; i++) {
      const child = fork(new URL("../helpers/auth-worker.ts", import.meta.url), { execArgv: ["--conditions=react-server", "--import", "tsx"], stdio: ["ignore", "ignore", "inherit", "ipc"] });
      children.push(child);
      const [message] = await once(child, "message"); origins.push(message.origin);
    }
    const responses = await Promise.all(Array.from({ length: 12 }, (_, i) => fetch(`${origins[i % 2]}/api/auth/sign-in/email`, { method: "POST", headers: { origin: origins[i % 2], "content-type": "application/json" }, body: JSON.stringify({ email: "po@example.com", password: "wrong-password" }), signal: AbortSignal.timeout(15000) })));
    assert.equal(responses.filter((r) => r.status === 401).length, 5);
    assert.equal(responses.filter((r) => r.status === 429).length, 7);
    assert.equal(responses.some((r) => r.headers.has("set-cookie")), false);
    await pool.query("TRUNCATE login_failure");
    const accepted = await Promise.all(Array.from({ length: 8 }, (_, i) => fetch(`${origins[i % 2]}/api/auth/sign-in/email`, { method: "POST", headers: { origin: origins[i % 2], "content-type": "application/json" }, body: JSON.stringify({ email: "po@example.com", password: "test-only-admin-password-2026" }), signal: AbortSignal.timeout(15000) })));
    assert.equal(accepted.filter((r) => r.status === 200).length, 8);
    assert.ok(accepted.every((r) => r.headers.has("set-cookie")));
  } finally {
    await pool.end();
    await Promise.all(children.map(async (child) => { const stopped = once(child, "exit"); child.send("stop"); await stopped; }));
  }
});
