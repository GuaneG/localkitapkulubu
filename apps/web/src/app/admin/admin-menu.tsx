"use client";
import { useState } from "react";
import Link from "next/link";
import { AdminPageHeader } from "./components/admin-page-header";
import { AdminButton } from "./components/admin-button";
import { AdminNotice } from "./components/admin-notice";
import { navigateAdmin, signOutAdmin } from "./client-actions";
import styles from "./admin.module.css";

export function AdminMenu() {
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  return <div className={styles.menu}>
    <AdminPageHeader title="Ana menü" subtitle="Hangi içeriği düzenlemek istersiniz?" navigation={<>
      <a href="/tr" target="_blank" rel="noopener noreferrer">Siteyi aç</a>
      <AdminButton disabled={busy} onClick={async () => {
        setBusy(true); setError("");
        try { await signOutAdmin(); navigateAdmin("/admin/giris"); }
        catch { setError("Çıkış yapılamadı. Yeniden deneyin."); setBusy(false); }
      }}>Çıkış yap</AdminButton>
    </>} />
    <nav aria-label="İçerik yönetimi"><ul className={styles.menuEntries}><li>
      <div><h2>Ayın Kitabı</h2><p>Taslakları bulun, düzenleyin ve yayını kontrol edin.</p></div>
      <Link className={`${styles.button} ${styles.primary}`} href="/admin/ayin-kitabi">Ayın Kitabı’nı aç</Link>
    </li></ul></nav><AdminNotice kind="error">{error}</AdminNotice>
  </div>;
}
