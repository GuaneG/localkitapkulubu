import "server-only";
import type { Pool } from "pg";
import type { createAuth } from "./auth";
import { loginEmail } from "./login-identity";
import { limitedSignIn } from "./limiter";
import { errorResponse, privateResponse, readJson, requireOrigin } from "../http";

export async function handleAuthRequest(request: Request, options: { auth: ReturnType<typeof createAuth>; limiterPool: Pool; origin: string; ip: string }) {
  try {
    const path = new URL(request.url).pathname;
    const login = path === "/api/auth/sign-in/email" && request.method === "POST";
    if (!login && !(path === "/api/auth/get-session" && request.method === "GET") && !(path === "/api/auth/sign-out" && request.method === "POST")) return privateResponse(new Response(null, { status: 404 }));
    if (request.method === "POST") requireOrigin(request, options.origin);
    if (!login) return privateResponse(await options.auth.handler(request));
    const body = await readJson(request);
    const email = loginEmail(body);
    const normalized = new Request(request.url, { method: "POST", headers: request.headers, body: JSON.stringify({ ...(body as object), email, rememberMe: true }) });
    const context = await options.auth.$context;
    const response = await limitedSignIn(options.limiterPool, context.secret, email, options.ip, () => options.auth.handler(normalized));
    return privateResponse(response);
  } catch (error) { return errorResponse(error); }
}
