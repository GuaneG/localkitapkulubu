import { errorResponse, privateResponse } from "@/server/http";
import { getAdminDrafts } from "@/server/monthly-read/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    return privateResponse(Response.json(await getAdminDrafts(request.headers)));
  } catch (error) {
    return errorResponse(error);
  }
}
