import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { copy, monthlyCopy } from "@/lib/content";
import { type Locale, pagePath } from "@/lib/i18n";
import { Arrow } from "./arrow";
import { AlbumPhotos } from "./album-photos";
import { MonthlyReadCover } from "./monthly-read-cover";
import { MonthlyReadBand } from "./monthly-read-band";
import { getPublicMonthlyRead } from "@/server/monthly-read/public";
import { BookShelf } from "./book-shelf";
import { NewsletterBand } from "./newsletter-band";
import { PreviewForm } from "./preview-form";

export async function Home({ locale }: { locale: Locale }) {
  await connection();
  let published;
  try { published = await getPublicMonthlyRead(locale); }
  catch { return <><p className="wrap" role="alert">{monthlyCopy[locale].readUnavailable}</p><NewsletterBand locale={locale} /></>; }
  return <>
    <MonthlyReadBand locale={locale} read={published.current} />
    {published.past.length > 0 && <BookShelf locale={locale}>{published.past.map((read) => <div key={read.revisionId} className="shelf-book" data-read-date={`${read.period}-01`}><MonthlyReadCover read={read} locale={locale} /></div>)}</BookShelf>}
    <NewsletterBand locale={locale} />
  </>;
}

export function About({ locale }: { locale: Locale }) {
  const t = copy[locale];
  return <>
    <div className="wrap about-copy"><h1>{t.aboutTitle}</h1><p>{t.aboutText}</p><p>{t.aboutSecond}</p></div>
    <section className="band goodies-band"><div className="band-inner">
      <div className="band-copy"><h2>LOCAL. Goodies</h2><p>{t.goodiesText}</p></div>
      <div className="band-art goodies-art"><Image src="/images/goodies-demo.png" alt={t.goodiesAlt} width={1536} height={1024} sizes="(max-width: 600px) 310px, 380px" loading="eager" /></div>
    </div></section>
  </>;
}

export function Gallery({ locale }: { locale: Locale }) {
  return <div className="wrap gallery-wrap"><div className="album-grid">
    {["pos-left", "pos-right", "pos-table"].map((position, index) => <Link key={index} className="album-card" href={pagePath(locale, "album", String(index + 1))} aria-label={`${locale === "tr" ? "Albümü aç" : "Open album"} ${index + 1}`}>
      <Image className={`photo ${position}`} src="/images/club-demo.png" alt={locale === "tr" ? "Kitap sohbetinden örnek fotoğraf" : "Sample book conversation photograph"} width={1536} height={1024} sizes="(max-width: 600px) 100vw, 640px" loading="eager" />
    </Link>)}
  </div></div>;
}

export function Album({ locale }: { locale: Locale }) {
  return <div className="wrap gallery-wrap">
    <Link className="album-back" href={pagePath(locale, "gallery")} aria-label={copy[locale].albumBack}><Arrow direction="left" /></Link>
    <AlbumPhotos locale={locale} />
  </div>;
}

export function Contact({ locale }: { locale: Locale }) {
  return <div className="wrap simple-page"><h1>{copy[locale].contact}</h1><p>{copy[locale].contactText}</p><PreviewForm locale={locale} contact /></div>;
}
