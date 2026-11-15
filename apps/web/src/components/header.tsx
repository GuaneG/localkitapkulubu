"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { copy } from "@/lib/content";
import { type Locale, pagePath, resolvePage } from "@/lib/i18n";

export function Header({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const [openMenuPath, setOpenMenuPath] = useState<string | null>(null);
  const menuOpen = openMenuPath === pathname;
  const current = resolvePage(locale, pathname.split("/").filter(Boolean).slice(1));
  const otherLocale = locale === "tr" ? "en" : "tr";
  const t = copy[locale];

  function rememberLanguage() {
    document.cookie = `local-language=${otherLocale}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  }

  return (
    <header className="site-header">
      <Link className="brand" href={pagePath(locale, "home")} aria-label={locale === "tr" ? "LOCAL. Ana sayfa" : "LOCAL. Home"}>LOCAL.</Link>
      <button className="menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="site-nav" onClick={() => setOpenMenuPath(menuOpen ? null : pathname)}>
        {locale === "tr" ? "Menü" : "Menu"}
      </button>
      <nav className={`nav${menuOpen ? " open" : ""}`} id="site-nav" aria-label={locale === "tr" ? "Ana menü" : "Main menu"}>
        {(["about", "gallery", "contact"] as const).map((page) => {
          const active = current?.page === page || (page === "gallery" && current?.page === "album");
          return <Link key={page} href={pagePath(locale, page)} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>{t[page]}</Link>;
        })}
      </nav>
      <Link className="language" href={pagePath(otherLocale, current?.page ?? "home", current?.albumId)} aria-label={locale === "tr" ? "Switch to English" : "Türkçeye geç"} onClick={rememberLanguage}>
        {locale.toUpperCase()} / {otherLocale.toUpperCase()}
      </Link>
    </header>
  );
}
