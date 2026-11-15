export const locales = ["en", "tr"] as const;
export type Locale = (typeof locales)[number];
export type PageName = "home" | "about" | "gallery" | "contact" | "album";

const slugs = {
  en: { home: "", about: "about", gallery: "gallery", contact: "contact" },
  tr: { home: "", about: "hakkimizda", gallery: "galeri", contact: "iletisim" },
} as const;

export function isLocale(value: string): value is Locale {
  return value === "en" || value === "tr";
}

export function pagePath(locale: Locale, page: PageName, albumId?: string) {
  if (page === "album") return `/${locale}/${slugs[locale].gallery}/${albumId}`;
  const slug = slugs[locale][page];
  return `/${locale}${slug ? `/${slug}` : ""}`;
}

export function resolvePage(locale: Locale, segments: string[] = []): { page: PageName; albumId?: string } | null {
  if (segments.length === 0) return { page: "home" };
  if (segments.length === 2 && segments[0] === slugs[locale].gallery && ["1", "2", "3"].includes(segments[1])) {
    return { page: "album", albumId: segments[1] };
  }
  if (segments.length !== 1) return null;
  for (const page of ["about", "gallery", "contact"] as const) {
    if (segments[0] === slugs[locale][page]) return { page };
  }
  return null;
}
