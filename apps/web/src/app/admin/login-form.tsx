"use client";
import { useState } from "react";
import styles from "./admin.module.css";

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
        window.location.assign("/admin/ayin-kitabi"); return;
      }
      setMessage(response.status === 429 ? `Çok fazla başarısız giriş. ${response.headers.get("Retry-After") || "900"} saniye sonra yeniden deneyin.` : response.status >= 500 ? "Giriş hizmetine ulaşılamadı. Yeniden deneyin." : "E-posta veya parola doğrulanamadı.");
    } catch { setMessage("Bağlantı kurulamadı. Yeniden deneyin."); }
    finally { setBusy(false); }
  }}>
    <label htmlFor="admin-email">E-posta</label><input id="admin-email" name="email" type="email" autoComplete="username" required disabled={busy} />
    <label htmlFor="admin-password">Parola</label><input id="admin-password" name="password" type="password" autoComplete="current-password" maxLength={128} required disabled={busy} />
    <div className={styles.actions}><button disabled={busy}>{busy ? "Giriş yapılıyor…" : "Giriş yap"}</button></div>
    {message && <p role="alert">{message}</p>}
  </form>;
}
