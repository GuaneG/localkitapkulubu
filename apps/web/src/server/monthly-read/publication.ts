import type { Locale } from "../../lib/i18n";
import type { PublishedRevision } from "./contracts";

export type PublicRead = { revisionId: string; period: string; title: string; author: string; band: string };
export type PublishedHome = { current: PublicRead | null; past: PublicRead[] };
type References = Array<{ period: string; revisionId: string }>;
type ReadRevision = (id: string) => Promise<PublishedRevision | null>;

export function currentPeriod(now: Date): string {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit" }).formatToParts(now);
  return `${parts.find((p) => p.type === "year")!.value}-${parts.find((p) => p.type === "month")!.value}`;
}

export async function revisionWithFallback(id: string, cached: ReadRevision, direct: ReadRevision): Promise<PublishedRevision | null> {
  try { return await cached(id); }
  catch { return direct(id); }
}

// Both real request handling and tests use this selection path. The references
// are read for each call; only the injected immutable revision reader may cache.
export async function loadPublishedHome(locale: Locale, now: Date, reads: { readReferences: (period: string) => Promise<References>; readRevision: ReadRevision }): Promise<PublishedHome> {
  const period = currentPeriod(now);
  const refs = (await reads.readReferences(period)).filter((ref) => ref.period <= period).sort((a, b) => b.period.localeCompare(a.period));
  const records = await Promise.all(refs.map(async (ref): Promise<PublicRead> => {
    const revision = await reads.readRevision(ref.revisionId);
    if (!revision || revision.id !== ref.revisionId || revision.period !== ref.period) throw new Error("Published revision does not match its reference");
    return { revisionId: revision.id, period: revision.period, title: locale === "tr" ? revision.titleTr : revision.titleEn, author: revision.author, band: locale === "tr" ? revision.bandTr : revision.bandEn };
  }));
  return { current: records.find((read) => read.period === period) ?? null, past: records.filter((read) => read.period < period) };
}
