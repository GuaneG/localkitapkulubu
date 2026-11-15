"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { isLocale, pagePath } from "@/lib/i18n";

export default function NotFound() {
  const params = useParams<{ locale: string }>();
  const locale = isLocale(params.locale) ? params.locale : "en";
  return <main id="main" tabIndex={-1} className="wrap simple-page">
    <h1>404</h1>
    <p>{locale === "tr" ? "Bu sayfa bulunamadı." : "This page could not be found."}</p>
    <Link className="text-link" href={pagePath(locale, "home")}>{locale === "tr" ? "Ana sayfaya dön" : "Back to home"}</Link>
  </main>;
}
