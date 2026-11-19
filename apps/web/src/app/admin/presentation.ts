import type { DraftFields, DraftSummary } from "@/server/monthly-read/contracts";
import type { Locale } from "@/lib/i18n";
import type { PublicRead } from "@/server/monthly-read/publication";

export function periodLabel(period: string) {
  const text = new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", month: "long", year: "numeric" }).format(new Date(`${period}-01T12:00:00Z`));
  return text.charAt(0).toLocaleUpperCase("tr-TR") + text.slice(1);
}
export function savedAt(value: string) {
  return new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", dateStyle: "long", timeStyle: "short" }).format(new Date(value));
}
export function draftStatus(draft: Pick<DraftSummary, "version" | "publication" | "isEmpty"> | null) {
  if (!draft) return "Henüz kaydedilmedi";
  if (draft.isEmpty) return "Boş taslak";
  if (!draft.publication) return "Taslak";
  return draft.publication.sourceVersion === draft.version ? "Yayında" : "Yeni taslak var";
}
export function previewRead(fields: DraftFields, period: string, locale: Locale): PublicRead {
  return { revisionId: "private-preview", period, readingNumber: fields.readingNumber ?? null,
    title: (locale === "tr" ? fields.titleTr : fields.titleEn) || (locale === "tr" ? "Kitap adı henüz girilmedi" : "Book title not entered yet"),
    author: fields.author || (locale === "tr" ? "Yazar henüz girilmedi" : "Author not entered yet"),
    band: (locale === "tr" ? fields.bandTr : fields.bandEn) || (locale === "tr" ? "Bu dilde şerit metni henüz girilmedi." : "Band text not entered yet."),
  };
}
