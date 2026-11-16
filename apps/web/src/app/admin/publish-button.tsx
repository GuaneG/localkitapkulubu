"use client";
import { useRef, useState } from "react";
import type { PublicationReceipt } from "@/server/monthly-read/contracts";
import styles from "./admin.module.css";

export function PublishButton({ period, version, publication, disabled }: { period: string; version: number; publication: PublicationReceipt | null; disabled: boolean }) {
  const [receipt, setReceipt] = useState(publication);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const sending = useRef(false);
  async function publish() {
    if (sending.current) return;
    sending.current = true; setBusy(true); setError("");
    try {
      const response = await fetch(`/api/admin/ayin-kitabi/${period}/yayin`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expectedVersion: version }) });
      if (response.ok) setReceipt(await response.json());
      else if (response.status === 409) setError("Taslak başka bir oturumda değişti. Sayfayı yeniden yükleyip güncel taslağı önizleyin.");
      else if (response.status === 401) setError("Oturumunuz sona erdi. Ayrı sekmede yeniden giriş yapın ve yayın durumunu kontrol edin.");
      else if (response.status === 422) setError("Yayın için iki dilin zorunlu alanlarını tamamlayıp kaydedin.");
      else setError("Sonuç doğrulanamadı. Sayfayı yeniden yükleyerek son yayını kontrol edin veya aynı sürümle yeniden deneyin.");
    } catch { setError("Sonuç doğrulanamadı. Sayfayı yeniden yükleyerek son yayını kontrol edin veya aynı sürümle yeniden deneyin."); }
    finally { sending.current = false; setBusy(false); }
  }
  return <>
    {receipt && <p>Son yayın · Sürüm {receipt.sourceVersion} · {receipt.publishedAt}</p>}
    <div className={styles.actions}><button disabled={disabled || busy || receipt?.sourceVersion === version} onClick={() => void publish()}>{busy ? "Yayınlanıyor…" : "Yayınla"}</button></div>
    <p role="status" aria-live="polite">{receipt?.sourceVersion === version ? "Yayınlandı. Bu kaydedilmiş sürüm ziyaretçilere açık." : ""}</p>
    {error && <div className={styles.notice}><p role="alert">{error}</p><a href={`/admin/ayin-kitabi/onizleme?ay=${period}`}>Yayın durumunu ve önizlemeyi yeniden yükle</a> · <a href="/admin/giris" target="_blank" rel="noopener noreferrer">Ayrı sekmede giriş yap</a></div>}
  </>;
}
