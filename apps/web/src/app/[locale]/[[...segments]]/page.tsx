import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { About, Album, Contact, Gallery, Home } from "@/components/pages";
import { copy } from "@/lib/content";
import { isLocale, locales, resolvePage } from "@/lib/i18n";

type Params = { locale: string; segments?: string[] };

export function generateStaticParams(): Params[] {
  return locales.flatMap((locale) => {
    const gallery = locale === "tr" ? "galeri" : "gallery";
    const pages = locale === "tr" ? ["hakkimizda", gallery, "iletisim"] : ["about", gallery, "contact"];
    return [{ locale, segments: [] }, ...pages.map((slug) => ({ locale, segments: [slug] })), ...["1", "2", "3"].map((id) => ({ locale, segments: [gallery, id] }))];
  });
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale, segments } = await params;
  if (!isLocale(locale)) return {};
  const resolved = resolvePage(locale, segments);
  if (!resolved) return {};
  const t = copy[locale];
  return { title: resolved.page === "album" ? t.gallery : t[resolved.page] };
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { locale, segments } = await params;
  if (!isLocale(locale)) notFound();
  const resolved = resolvePage(locale, segments);
  if (!resolved) notFound();
  const pages = { home: Home, about: About, gallery: Gallery, contact: Contact, album: Album };
  const Content = pages[resolved.page];
  return <main id="main" tabIndex={-1} className={`page-${resolved.page}`}><Content key={locale} locale={locale} /></main>;
}
