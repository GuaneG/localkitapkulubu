import "server-only";
import { eq } from "drizzle-orm";
import { getAuth } from "./auth";
import { getDb } from "../db/client";
import { siteAdmin } from "../db/schema";
import { HttpError } from "../monthly-read/contracts";

export async function requireAdmin(headers: Headers) {
  if (!headers.get("cookie")) throw new HttpError(401, "Yeniden giriş yapın. Metniniz korundu.");
  const session = await getAuth().api.getSession({ headers });
  if (!session) throw new HttpError(401, "Oturumunuz sona erdi. Yeniden giriş yapın; metniniz korundu.");
  const [admin] = await getDb().select().from(siteAdmin).where(eq(siteAdmin.userId, session.user.id));
  if (!admin) throw new HttpError(403, "Bu hesap yönetici değil.");
  return session;
}
