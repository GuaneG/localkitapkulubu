import type { Metadata } from "next";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { isLocale } from "@/lib/i18n";
import "../globals.css";

export const metadata: Metadata = {
  title: { default: "LOCAL. Kitap Kulübü", template: "%s | LOCAL." },
  robots: { index: false, follow: false },
  icons: { icon: "/icon.svg" },
};

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale: requested } = await params;
  const locale = isLocale(requested) ? requested : "en";
  return (
    <html lang={locale}>
      <head><link rel="stylesheet" href="https://use.typekit.net/qrm1kdq.css" /></head>
      <body>
        <a className="skip" href="#main">{locale === "tr" ? "İçeriğe geç" : "Skip to content"}</a>
        <Header locale={locale} />
        {children}
        <Footer locale={locale} />
      </body>
    </html>
  );
}
