import { loadDraft } from "../../load-draft";
import styles from "../../admin.module.css";
import { MonthlyReadBand } from "@/components/monthly-read-band";
import { publicationIssues, draftFieldNames, type DraftFields } from "@/server/monthly-read/contracts";
import { PublishButton } from "../../publish-button";

export const dynamic = "force-dynamic";
export default async function PreviewPage({ searchParams }: { searchParams: Promise<{ ay?: string; dil?: string }> }) {
  const params = await searchParams;
  const period = params.ay || ""; const locale = params.dil === "en" ? "en" : "tr";
  const result = await loadDraft(period);
  if (result.error) return <p role="alert">{result.error}</p>;
  const draft = result.draft;
  const issues = draft ? publicationIssues(draft) : [];
  return <>
    <h1>Özel taslak önizlemesi</h1><p>Bu görünüm yalnız yöneticilere açıktır.</p>
    <p><a href={`/admin/ayin-kitabi?ay=${encodeURIComponent(period)}`}>Editöre dön</a> · <a href={`?ay=${encodeURIComponent(period)}&dil=${locale === "tr" ? "en" : "tr"}`}>{locale === "tr" ? "EN önizleme" : "TR önizleme"}</a></p>
    {!result.draft ? <p>Bu ay için henüz kaydedilmiş taslak yok.</p> : <>
      <p>Taslak · {period} · Sürüm {result.draft.version} · Kayıt: {result.draft.updatedAt}</p>
      <MonthlyReadBand locale={locale} read={{ revisionId: "preview", period, title: (locale === "tr" ? result.draft.titleTr : result.draft.titleEn) || "Kitap adı henüz girilmedi", author: result.draft.author || "Yazar henüz girilmedi", band: (locale === "tr" ? result.draft.bandTr : result.draft.bandEn) || "Bu dilde şerit metni henüz girilmedi." }} />
      {issues.length > 0 && <div className={styles.notice}><p>Yayın için tamamlanması gereken alanlar:</p><ul>{issues.map((field) => <li key={field}>{draftFieldNames[field as keyof DraftFields]}</li>)}</ul></div>}
      <PublishButton key={result.draft.version} period={period} version={result.draft.version} publication={result.draft.publication} disabled={issues.length > 0} />
    </>}
  </>;
}
