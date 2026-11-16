import { monthlyCopy } from "@/lib/content";
import type { Locale } from "@/lib/i18n";
import type { PublicRead } from "@/server/monthly-read/publication";
import { MonthlyReadCover } from "./monthly-read-cover";
import styles from "./monthly-read.module.css";

export function MonthlyReadBand({ locale, read }: { locale: Locale; read: PublicRead | null }) {
  return <section className={`band read-band ${styles.band}`} lang={locale}><div className={`band-inner ${styles.inner}`}>
    <div className={`band-copy ${styles.copy}`}><h1>Read of the month</h1><p>{read?.band || monthlyCopy[locale].readUnannounced}</p></div>
    <div className={`band-art ${styles.art}`}>{read && <div className={styles.featured}><MonthlyReadCover locale={locale} read={read} /></div>}</div>
  </div></section>;
}
