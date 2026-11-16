import { isIP } from "node:net";
import { HttpError } from "../monthly-read/contracts";

export function loginEmail(body: unknown): string {
  if (!body || typeof body !== "object") throw new HttpError(400, "Giriş bilgileri geçersiz.");
  const { email, password } = body as Record<string, unknown>;
  if (typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || typeof password !== "string" || password.length < 1 || password.length > 128) throw new HttpError(400, "Giriş bilgileri geçersiz.");
  return email.trim().toLowerCase();
}

export function clientIp(request: Request, config: { mode: "loopback" | "netlify"; origin: string }): string {
  if (config.mode === "netlify") {
    // Only enabled by server NETLIFY=true; the platform must overwrite this header.
    const ip = request.headers.get("x-nf-client-connection-ip");
    if (!ip || !isIP(ip)) throw new HttpError(503, "Güvenilir istemci adresi alınamadı.");
    return normalizeIp(ip);
  }
  const origin = new URL(config.origin);
  const internal = new URL(request.url);
  const loopback = ["127.0.0.1", "localhost", "[::1]"];
  // Next normalizes the internal URL to localhost even when bound to 127.0.0.1.
  if (!loopback.includes(origin.hostname) || !loopback.includes(internal.hostname) || internal.port !== origin.port || internal.protocol !== origin.protocol || (request.headers.has("host") && request.headers.get("host") !== origin.host)) throw new HttpError(503, "Yerel giriş yalnız loopback adresinde kullanılabilir.");
  // next dev/start bind only to 127.0.0.1. Never trust forwarded headers here.
  return "127.0.0.1";
}

export function normalizeIp(ip: string): string {
  if (!isIP(ip)) throw new HttpError(503, "İstemci adresi geçersiz.");
  if (ip.toLowerCase().startsWith("::ffff:") && isIP(ip.slice(7)) === 4) return ip.slice(7);
  return isIP(ip) === 6 ? new URL(`http://[${ip}]/`).hostname.slice(1, -1) : ip;
}
