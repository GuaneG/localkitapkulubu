import { monthlyCopy } from "@/lib/content";
import type { Locale } from "@/lib/i18n";
import type { PublicRead } from "@/server/monthly-read/publication";
import styles from "./monthly-read.module.css";

export function MonthlyReadCover({ locale, read }: { locale: Locale; read: PublicRead }) {
  return <div className={`book-cover ${styles.cover}`} role="img" aria-label={`${monthlyCopy[locale].coverPlaceholder}: ${read.title}`}>
    <span className={styles.caption}>{monthlyCopy[locale].coverPlaceholder}</span>
    <p className={styles.title}>{read.title}</p><span>{read.author}</span>
  </div>;
}
