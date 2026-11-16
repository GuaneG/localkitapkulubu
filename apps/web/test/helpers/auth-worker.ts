import { createServer } from "node:http";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { createAuth } from "../../src/server/auth/auth";
import { handleAuthRequest } from "../../src/server/auth/endpoint";
import { normalizeIp } from "../../src/server/auth/login-identity";

// Real HTTP adapter used only by integration tests, with socket-derived IP.
const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL, max: 2 });
const limiterPool = new Pool({ connectionString: process.env.TEST_DATABASE_URL, max: 2 });
let origin = "";
const server = createServer(async (incoming, outgoing) => {
  const chunks: Buffer[] = []; for await (const chunk of incoming) chunks.push(Buffer.from(chunk));
  const request = new Request(`${origin}${incoming.url}`, { method: incoming.method, headers: incoming.headers as Record<string, string>, body: incoming.method === "POST" ? Buffer.concat(chunks) : undefined });
  const auth = createAuth(drizzle(pool), { origin, secret: "integration-only-secret-with-more-than-32-characters" });
  const result = await handleAuthRequest(request, { auth, limiterPool, origin, ip: normalizeIp(incoming.socket.remoteAddress!) });
  outgoing.writeHead(result.status, Object.fromEntries(result.headers)); outgoing.end(Buffer.from(await result.arrayBuffer()));
});
server.listen(0, "127.0.0.1", () => {
  origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  process.send?.({ origin });
});
process.on("message", async (message) => {
  if (message !== "stop") return;
  server.close(async () => { await pool.end(); await limiterPool.end(); process.exit(0); });
});
