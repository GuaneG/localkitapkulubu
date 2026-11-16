import "server-only";
import { createHmac } from "node:crypto";
import type { Pool } from "pg";

export async function limitedSignIn(pool: Pool, secret: string, email: string, ip: string, authenticate: () => Promise<Response>): Promise<Response> {
  const key = (kind: string, value: string) => `${kind}:${createHmac("sha256", secret).update(value).digest("hex")}`;
  const keys = [key("account", email), key("ip", ip)].sort();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query("SET LOCAL statement_timeout = '10s'");
    for (const value of keys) await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [value]);
    const { rows: [window] } = await client.query<{ now: Date }>("SELECT clock_timestamp() AS now");
    const since = new Date(window.now.getTime() - 900000);
    await client.query("DELETE FROM login_failure WHERE key = ANY($1::text[]) AND failed_at <= $2", [keys, since]);
    const failures = await client.query<{ count: string; oldest: Date }>("SELECT count(*) AS count, min(failed_at) AS oldest FROM login_failure WHERE key = ANY($1::text[]) AND failed_at > $2 GROUP BY key", [keys, since]);
    const retry = Math.max(0, ...failures.rows.filter((r) => Number(r.count) >= 5).map((r) => Math.ceil((r.oldest.getTime() + 900000 - window.now.getTime()) / 1000)));
    if (retry > 0) {
      await client.query("COMMIT");
      return Response.json({ message: "Çok fazla başarısız giriş. Lütfen belirtilen süre sonra yeniden deneyin." }, { status: 429, headers: { "Retry-After": String(retry) } });
    }
    const response = await authenticate();
    if (response.status === 401) {
      const body = await response.clone().json().catch(() => null);
      if (body?.code === "INVALID_EMAIL_OR_PASSWORD") {
        await client.query("INSERT INTO login_failure (key, failed_at) SELECT unnest($1::text[]), clock_timestamp()", [keys]);
      }
    }
    // Never forward a session response before the limiter transaction commits.
    await client.query("COMMIT");
    return response;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally { client.release(); }
}
