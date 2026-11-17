import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { HttpError } from "@/server/monthly-read/contracts";
import { getAdminDraft, getAdminDrafts } from "@/server/monthly-read/service";

export async function loadDraft(period: string) {
  try { return { draft: await getAdminDraft(new Headers(await headers()), period), error: null }; }
  catch (error) {
    if (error instanceof HttpError && error.status === 401) redirect("/admin/giris");
    return { draft: null, error: error instanceof HttpError ? error.message : "Taslağa ulaşılamadı. Yeniden deneyin." };
  }
}

export async function loadDrafts() {
  try { return { drafts: await getAdminDrafts(new Headers(await headers())), error: null }; }
  catch (error) {
    if (error instanceof HttpError && error.status === 401) redirect("/admin/giris");
    return { drafts: [], error: error instanceof HttpError ? error.message : "Kayıtlı taslaklar yüklenemedi. Sayfayı yeniden açarak deneyin." };
  }
}
