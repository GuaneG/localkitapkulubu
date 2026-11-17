import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { requireAdmin } from "@/server/auth/require-admin";
import { HttpError } from "@/server/monthly-read/contracts";
import { AdminMenu } from "./admin-menu";
import { AdminNotice } from "./components/admin-notice";

export const dynamic = "force-dynamic";
export default async function AdminPage() {
  try { await requireAdmin(new Headers(await headers())); }
  catch (error) {
    if (error instanceof HttpError && error.status === 401) redirect("/admin/giris");
    return <AdminNotice kind="error">{error instanceof HttpError ? error.message : "Yönetim alanına ulaşılamadı. Yeniden deneyin."}</AdminNotice>;
  }
  return <AdminMenu />;
}
