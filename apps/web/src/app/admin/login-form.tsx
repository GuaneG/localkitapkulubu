"use client";
import { useState } from "react";
import styles from "./admin.module.css";
import { AdminButton } from "./components/admin-button";
import { AdminField } from "./components/admin-field";
import { AdminNotice } from "./components/admin-notice";

export function LoginForm() {
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  return <form onSubmit={async (event) => {
    event.preventDefault(); if (busy) return;
    const fields = new FormData(event.currentTarget); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/auth/sign-in/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: fields.get("email"), password: fields.get("password") }) });
      if (response.ok) {
        // Full navigation discards any cached pre-login admin tree.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign("/admin"); return;
      }
      setMessage(response.status === 429 ? `Çok fazla başarısız giriş. ${response.headers.get("Retry-After") || "900"} saniye sonra yeniden deneyin.` : response.status >= 500 ? "Giriş hizmetine ulaşılamadı. Yeniden deneyin." : "E-posta veya parola doğrulanamadı.");
    } catch { setMessage("Bağlantı kurulamadı. Yeniden deneyin."); }
    finally { setBusy(false); }
  }}>
    <AdminField id="admin-email" label="E-posta" name="email" type="email" autoComplete="username" required disabled={busy} />
    <AdminField id="admin-password" label="Parola" name="password" type="password" autoComplete="current-password" maxLength={128} required disabled={busy} />
    <div className={styles.actions}><AdminButton type="submit" variant="primary" disabled={busy}>{busy ? "Giriş yapılıyor…" : "Giriş yap"}</AdminButton></div>
    <AdminNotice kind="error">{message}</AdminNotice>
  </form>;
}
