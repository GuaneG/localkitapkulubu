import { DraftEditor } from "../draft-editor";
import { loadDraft, loadDrafts } from "../load-draft";
import { AdminNotice } from "../components/admin-notice";

export const dynamic = "force-dynamic";
export default async function DraftPage({ searchParams }: { searchParams: Promise<{ ay?: string }> }) {
  const period = (await searchParams).ay || new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit" }).format(new Date());
  const result = await loadDraft(period);
  if (result.error) return <AdminNotice kind="error">{result.error}</AdminNotice>;
  const list = await loadDrafts();
  return <DraftEditor key={period} period={period} initial={result.draft} initialSummaries={list.drafts} listError={list.error} />;
}
