import { authConfig } from "@/server/auth/auth";
import { errorResponse, privateResponse, readJson, requireOrigin } from "@/server/http";
import { getAdminDraft, saveAdminDraft } from "@/server/monthly-read/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ period: string }> };
export async function GET(request: Request, context: Context) {
  try { return privateResponse(Response.json(await getAdminDraft(request.headers, (await context.params).period))); }
  catch (error) { return errorResponse(error); }
}
export async function PUT(request: Request, context: Context) {
  try {
    requireOrigin(request, authConfig().origin);
    return privateResponse(Response.json(await saveAdminDraft(request.headers, (await context.params).period, await readJson(request))));
  } catch (error) { return errorResponse(error); }
}
