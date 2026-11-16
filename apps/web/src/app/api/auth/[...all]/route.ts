import { authConfig, getAuth } from "@/server/auth/auth";
import { handleAuthRequest } from "@/server/auth/endpoint";
import { clientIp } from "@/server/auth/login-identity";
import { getLimiterPool } from "@/server/db/client";
import { errorResponse } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function handle(request: Request) {
  try {
    const config = authConfig();
    const ip = clientIp(request, { mode: process.env.NETLIFY === "true" ? "netlify" : "loopback", origin: config.origin });
    return await handleAuthRequest(request, { auth: getAuth(), limiterPool: getLimiterPool(), origin: config.origin, ip });
  } catch (error) { return errorResponse(error); }
}
export { handle as GET, handle as POST };
