import Link from "next/link";
import { copy } from "@/lib/content";
import { type Locale, pagePath } from "@/lib/i18n";

export function Footer({ locale }: { locale: Locale }) {
  const t = copy[locale];
  return (
    <footer>
      <div className="wrap footer-inner">
        <span className="brand footer-brand">LOCAL.</span>
        <div className="footer-links">
          <Link href={pagePath(locale, "about")}>{t.about}</Link>
          <Link href={pagePath(locale, "contact")}>{t.contact}</Link>
          <a className="social-link" href="https://www.instagram.com/localkitapkulubu/?hl=en">Instagram</a>
          <a className="social-link" href="https://thelocalletter.substack.com/">Substack</a>
          <a className="social-link" href="https://www.shopier.com/localkitapkulubu">Shopier</a>
        </div>
      </div>
    </footer>
  );
}
