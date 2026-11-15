import { copy } from "@/lib/content";
import type { Locale } from "@/lib/i18n";
import { PreviewForm } from "./preview-form";

export function NewsletterBand({ locale }: { locale: Locale }) {
  const t = copy[locale];
  return (
    <section className="band join-band" id="newsletter">
      <div className="band-inner">
        <div className="band-copy"><h2>{t.joinTitle}</h2><p>{t.joinText}</p></div>
        <div className="join-form"><PreviewForm locale={locale} /></div>
      </div>
    </section>
  );
}
