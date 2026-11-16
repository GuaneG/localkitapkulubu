import assert from "node:assert/strict";
import { createServer, request as httpRequest } from "node:http";
import { test } from "node:test";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { testDatabaseUrl } from "../helpers/database";

test("real HTTP Better Auth login enforces persistent IP/account failures, expiry, concurrent requests and no cookie on storage failure", { skip: !process.env.TEST_DATABASE_URL }, async () => {
  testDatabaseUrl();
  const { migrateDatabase } = await import("../../src/server/db/migrate.ts");
  const { createAuth } = await import("../../src/server/auth/auth.ts");
  const { provisionAdmin } = await import("../../src/server/auth/provision.ts");
  const { handleAuthRequest } = await import("../../src/server/auth/endpoint.ts");
  const { normalizeIp } = await import("../../src/server/auth/login-identity.ts");
  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL, max: 2 });
  const limits = new Pool({ connectionString: process.env.TEST_DATABASE_URL, max: 2 });
  const db = drizzle(pool);
  let dispatch: (request: Request, ip: string) => Promise<Response>;
  const server = createServer(async (req, res) => {
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) if (value) headers.set(key, Array.isArray(value) ? value.join(", ") : value);
      const request = new Request(`${origin}${req.url}`, { method: req.method, headers, body: req.method === "POST" ? Buffer.concat(chunks) : undefined });
      const response = await dispatch(request, normalizeIp(req.socket.remoteAddress!));
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch { res.writeHead(500); res.end(); }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as { port: number };
  const origin = `http://127.0.0.1:${address.port}`;
  const config = { origin, secret: "integration-only-secret-with-more-than-32-characters" };
  const password = "test-only-admin-password-2026";
  const email = "po@example.com";
  const login = (account = email, pass = password, ip = "127.0.0.1") => new Promise<{ status: number; headers: import("node:http").IncomingHttpHeaders; body: string }>((resolve, reject) => {
    const req = httpRequest(`${origin}/api/auth/sign-in/email`, { method: "POST", localAddress: ip, headers: { "content-type": "application/json", origin, "x-forwarded-for": "9.9.9.9" } }, (res) => {
      let body = ""; res.on("data", (chunk) => body += chunk); res.on("end", () => resolve({ status: res.statusCode!, headers: res.headers, body }));
    });
    req.on("error", reject); req.end(JSON.stringify({ email: account, password: pass }));
  });
  try {
    await migrateDatabase(db);
    await pool.query("TRUNCATE site_admin, auth_session, auth_account, auth_user, login_failure CASCADE");
    await provisionAdmin(db, config, email, password);
    await provisionAdmin(db, config, email, "does-not-reset-existing-password");
    assert.equal((await pool.query("SELECT count(*) FROM auth_user")).rows[0].count, "1");
    const auth = createAuth(db, config);
    dispatch = (req, ip) => handleAuthRequest(req, { auth, limiterPool: limits, origin, ip });
    const first = await login(); assert.equal(first.status, 200); assert.ok(first.headers["set-cookie"]);
    const second = await login(); assert.equal(second.status, 200);
    const sessions = (await pool.query('SELECT "createdAt", "expiresAt" FROM auth_session')).rows;
    assert.equal(sessions.length, 2);
    assert.equal(sessions[0].expiresAt.getTime() - sessions[0].createdAt.getTime(), 604800000);
    const signup = await fetch(`${origin}/api/auth/sign-up/email`, { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ email: "attacker@example.com", password, name: "Other" }) });
    assert.equal(signup.status, 404);
    const badOrigin = await fetch(`${origin}/api/auth/sign-in/email`, { method: "POST", headers: { origin: "https://evil.example", "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
    assert.equal(badOrigin.status, 403);
    for (let i = 0; i < 4; i++) assert.equal((await login(email, "wrong-password")).status, 401);
    assert.equal((await login()).status, 200); // Does not erase previous failures.
    assert.equal((await login(email, "wrong-password")).status, 401);
    const blocked = await login(); assert.equal(blocked.status, 429); assert.ok(Number(blocked.headers["retry-after"]) > 0); assert.equal(blocked.headers["set-cookie"], undefined);
    assert.equal((await login(email, password, "127.0.0.2")).status, 429); // Account independent of IP.
    assert.equal((await login("other@example.com", "wrong-password")).status, 429); // IP independent of account.
    assert.equal((await login("other@example.com", "wrong-password", "127.0.0.2")).status, 401);
    await pool.query("UPDATE login_failure SET failed_at = clock_timestamp() - interval '899 seconds'");
    assert.equal((await login()).status, 429);
    // Move the persisted window, not a sleep or a replacement auth result.
    await pool.query("UPDATE login_failure SET failed_at = clock_timestamp() - interval '901 seconds'");
    assert.equal((await login()).status, 200);
    await pool.query("TRUNCATE login_failure");
    const auth2 = createAuth(drizzle(pool), config);
    let n = 0;
    dispatch = (req, ip) => handleAuthRequest(req, { auth: n++ % 2 ? auth : auth2, limiterPool: limits, origin, ip });
    const parallel = await Promise.all(Array.from({ length: 10 }, () => login(email, "wrong-password")));
    assert.equal(parallel.filter((r) => r.status === 401).length, 5);
    assert.equal(parallel.filter((r) => r.status === 429).length, 5);
    assert.equal(parallel.some((r) => r.headers["set-cookie"]), false);
    const restart = new Pool({ connectionString: process.env.TEST_DATABASE_URL, max: 2 });
    try {
      dispatch = (req, ip) => handleAuthRequest(req, { auth: createAuth(drizzle(pool), config), limiterPool: restart, origin, ip });
      assert.equal((await login()).status, 429);
    } finally { await restart.end(); }
    await pool.query("TRUNCATE login_failure");
    const broken = new Pool({ connectionString: process.env.TEST_DATABASE_URL }); await broken.end();
    dispatch = (req, ip) => handleAuthRequest(req, { auth, limiterPool: broken, origin, ip });
    const failed = await login(); assert.equal(failed.status, 503); assert.equal(failed.headers["set-cookie"], undefined);
    dispatch = (req, ip) => handleAuthRequest(req, { auth, limiterPool: limits, origin, ip });
    assert.equal((await login(email, "wrong-password")).status, 401);
    await pool.query("UPDATE login_failure SET failed_at = clock_timestamp() - interval '901 seconds'");
    await pool.query("CREATE FUNCTION test_login_commit_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test deferred commit failure'; END $$");
    await pool.query("CREATE CONSTRAINT TRIGGER test_login_commit_failure AFTER DELETE ON login_failure DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION test_login_commit_failure()");
    try {
      const before = Number((await pool.query("SELECT count(*) FROM auth_session")).rows[0].count);
      const commitFailure = await login();
      assert.equal(commitFailure.status, 503);
      assert.equal(commitFailure.headers["set-cookie"], undefined);
      assert.ok(!commitFailure.body.includes('"token"'));
      const after = Number((await pool.query("SELECT count(*) FROM auth_session")).rows[0].count);
      assert.equal(after, before + 1); // Real auth completed; its response was withheld at failed COMMIT.
    } finally {
      await pool.query("DROP TRIGGER test_login_commit_failure ON login_failure");
      await pool.query("DROP FUNCTION test_login_commit_failure()");
    }
  } finally { await new Promise<void>((resolve) => server.close(() => resolve())); await limits.end(); await pool.end(); }
});
