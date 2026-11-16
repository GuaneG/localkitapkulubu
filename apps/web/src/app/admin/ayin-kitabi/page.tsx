import { DraftEditor } from "../draft-editor";
import { loadDraft } from "../load-draft";

export const dynamic = "force-dynamic";
export default async function DraftPage({ searchParams }: { searchParams: Promise<{ ay?: string }> }) {
  const period = (await searchParams).ay || new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit" }).format(new Date());
  const result = await loadDraft(period);
  return <><h1>Ayın Kitabı taslağı</h1>{result.error ? <p role="alert">{result.error}</p> : <DraftEditor key={period} period={period} initial={result.draft} />}</>;
}
