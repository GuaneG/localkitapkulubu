import { loadDraft } from "../../load-draft";
import styles from "../../admin.module.css";
import { MonthlyReadBand } from "@/components/monthly-read-band";
import { isEmptyDraft, publicationIssues, draftFieldNames, type DraftTextFields } from "@/server/monthly-read/contracts";
import { PublishButton } from "../../publish-button";
import { AdminPageHeader } from "../../components/admin-page-header";
import { AdminNotice } from "../../components/admin-notice";
import { DraftStatus } from "../../components/draft-status";
import { periodLabel, previewRead, savedAt } from "../../presentation";

export const dynamic = "force-dynamic";
export default async function PreviewPage({ searchParams }: { searchParams: Promise<{ ay?: string; dil?: string }> }) {
  const params = await searchParams;
  const period = params.ay || ""; const locale = params.dil === "en" ? "en" : "tr";
  const result = await loadDraft(period);
  if (result.error) return <AdminNotice kind="error">{result.error}</AdminNotice>;
  const draft = result.draft;
  const issues = draft ? publicationIssues(draft) : [];
  return <div className={styles.finalPreview} data-preview-version={draft?.version ?? ""}>
    <AdminPageHeader title="Yayın öncesi son kontrol" subtitle={periodLabel(period)} navigation={<><a href={`/admin/ayin-kitabi?ay=${encodeURIComponent(period)}`}>Editöre dön</a><a href={`?ay=${encodeURIComponent(period)}&dil=${locale === "tr" ? "en" : "tr"}`}>{locale === "tr" ? "İngilizce önizleme" : "Türkçe önizleme"}</a></>} />
    <p>Bu görünüm yalnız yöneticilere açıktır ve son kaydedilmiş taslağı gösterir. Yayınla, iki dilin kaydedilmiş içeriğini birlikte yayınlar.</p>
    {!result.draft ? <p>Bu ay için henüz kaydedilmiş taslak yok.</p> : <>
      <p>Son kayıt: {savedAt(result.draft.updatedAt)} · <DraftStatus draft={{ ...result.draft, isEmpty: isEmptyDraft(result.draft) }} /></p>
      <MonthlyReadBand locale={locale} read={previewRead(result.draft, period, locale)} />
      {issues.length > 0 && <AdminNotice><p>Yayın için tamamlanması gereken alanlar:</p><ul>{issues.map((field) => <li key={field}>{draftFieldNames[field as keyof DraftTextFields]}</li>)}</ul></AdminNotice>}
      <PublishButton key={result.draft.version} period={period} version={result.draft.version} publication={result.draft.publication} disabled={issues.length > 0} />
    </>}
  </div>;
}
