import type { ReactNode } from "react";
import styles from "../admin.module.css";

export function AdminPageHeader({ title, subtitle, navigation }: { title: string; subtitle?: string; navigation?: ReactNode }) {
  return <header className={styles.pageHeader}>
    {navigation && <nav className={styles.navigation} aria-label="Yönetim gezinmesi">{navigation}</nav>}
    <h1>{title}</h1>{subtitle && <p className={styles.subtitle}>{subtitle}</p>}
  </header>;
}
