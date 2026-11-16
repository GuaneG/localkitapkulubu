import { authConfig } from "@/server/auth/auth";
import { errorResponse, privateResponse, readJson, requireOrigin } from "@/server/http";
import { publishAdminDraft } from "@/server/monthly-read/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ period: string }> }) {
  try {
    requireOrigin(request, authConfig().origin);
    return privateResponse(Response.json(await publishAdminDraft(request.headers, (await context.params).period, await readJson(request))));
  } catch (error) { return errorResponse(error); }
}
