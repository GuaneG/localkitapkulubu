import type { Metadata } from "next";
import styles from "./admin.module.css";

export const metadata: Metadata = { title: "LOCAL. Yönetim", robots: { index: false, follow: false } };
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <html lang="tr"><body className={styles.body}><main className={styles.main}><header className={styles.header}>LOCAL. / Yönetim</header>{children}</main></body></html>;
}
