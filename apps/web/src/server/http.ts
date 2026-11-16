import "server-only";
import { HttpError } from "./monthly-read/contracts";

export function privateResponse(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "private, no-store");
  headers.set("X-Robots-Tag", "noindex, nofollow");
  return new Response(response.body, { status: response.status, headers });
}
export function errorResponse(error: unknown): Response {
  return privateResponse(Response.json({ message: error instanceof HttpError ? error.message : "İşlem tamamlanamadı. Metniniz korundu; yeniden deneyin." }, { status: error instanceof HttpError ? error.status : 503 }));
}
export function requireOrigin(request: Request, origin: string) {
  if (request.headers.get("origin") !== origin) throw new HttpError(403, "İstek kaynağı doğrulanamadı.");
}
export async function readJson(request: Request): Promise<unknown> {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new HttpError(400, "JSON verisi gerekli.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "İstek verisi eksik.");
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 65536) throw new HttpError(413, "İstek çok büyük.");
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (error) {
    await reader.cancel().catch(() => {});
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "İstek verisi geçersiz.");
  }
}
