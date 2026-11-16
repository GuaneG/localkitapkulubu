"use client";
import { useEffect, useRef, useState } from "react";
import type { Draft, DraftFields } from "@/server/monthly-read/contracts";
import { draftFieldNames as names } from "@/server/monthly-read/contracts";
import styles from "./admin.module.css";

function fields(draft: Draft | null): DraftFields {
  return { titleTr: draft?.titleTr || "", titleEn: draft?.titleEn || "", author: draft?.author || "", bandTr: draft?.bandTr || "", bandEn: draft?.bandEn || "" };
}

export function DraftEditor({ period, initial }: { period: string; initial: Draft | null }) {
  const [saved, setSaved] = useState(initial);
  const [value, setValue] = useState(() => fields(initial));
  const [selectedMonth, setSelectedMonth] = useState(period);
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  const [latest, setLatest] = useState<Draft | null>(null);
  const skipWarning = useRef(false);
  const dirty = JSON.stringify(value) !== JSON.stringify(fields(saved));
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty && !skipWarning.current) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function leave(url: string) {
    if (dirty && !window.confirm("Kaydedilmemiş değişiklikleriniz var. Ayrılmak istiyor musunuz?")) return;
    skipWarning.current = true; window.location.assign(url);
  }
  function input(key: keyof DraftFields, multiline = false) {
    const props = { id: key, value: value[key], maxLength: multiline ? 5000 : 300, onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValue((old) => ({ ...old, [key]: event.target.value })) };
    return <label htmlFor={key}>{names[key]}{multiline ? <textarea {...props} /> : <input {...props} />}</label>;
  }
  async function save() {
    if (busy) return;
    setBusy(true); setMessage(""); setError(""); setLatest(null);
    try {
      const response = await fetch(`/api/admin/ayin-kitabi/${period}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...value, expectedVersion: saved?.version ?? null }) });
      if (response.ok) {
        const result: Draft = await response.json(); setSaved(result); setValue(fields(result)); setMessage(`Taslak kaydedildi. Sürüm ${result.version}.`);
      } else {
        if (response.status === 401) setError("Oturumunuz sona erdi. Ayrı sekmede yeniden giriş yapın. Metniniz korundu.");
        else if (response.status === 409) {
          setError("Taslak başka bir oturumda kaydedildi veya değişti. Metniniz korundu.");
          const current = await fetch(`/api/admin/ayin-kitabi/${period}`, { cache: "no-store" });
          if (current.ok) setLatest(await current.json());
        } else setError("Taslak kaydedilemedi. Alan uzunluklarını ve bağlantınızı kontrol edin. Metniniz korundu.");
      }
    } catch { setError("Sunucuya ulaşılamadı. Metniniz korundu; yeniden deneyin."); }
    finally { setBusy(false); }
  }
  return <>
    <p>Taslağı kaydetmek ziyaretçi sayfalarını değiştirmez. Kaydedilmiş sürümü özel önizlemeden yayınlayabilirsiniz.</p>
    <label htmlFor="month">Okuma ayı</label><input id="month" type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} disabled={busy} />
    <div className={styles.actions}><button disabled={busy || !/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(selectedMonth)} onClick={() => leave(`/admin/ayin-kitabi?ay=${selectedMonth}`)}>Ayı aç</button></div>
    <p>{period} · {saved ? `Sürüm ${saved.version} · Son kayıt ${saved.updatedAt}` : "Henüz kaydedilmedi"}{dirty ? " · Kaydedilmemiş değişiklikler var" : ""}</p>
    <p>{saved?.publication ? `Son yayın · Sürüm ${saved.publication.sourceVersion}${saved.publication.sourceVersion === saved.version ? " · Güncel taslak yayında" : " · Yeni taslak henüz yayınlanmadı"}` : "Bu ay henüz yayınlanmadı"}</p>
    <form onSubmit={(event) => { event.preventDefault(); void save(); }}>
      <fieldset disabled={busy}>
        {input("author")}
        <div className={styles.languages}><section><h2>Türkçe içerik</h2>{input("titleTr")}{input("bandTr", true)}</section><section><h2>English content</h2>{input("titleEn")}{input("bandEn", true)}</section></div>
      </fieldset>
      <div className={styles.actions}>
        <button type="submit" disabled={busy}>{busy ? "Kaydediliyor…" : "Taslağı kaydet"}</button>
        {(["tr", "en"] as const).map((locale) => <button type="button" key={locale} disabled={busy} onClick={() => {
          if (dirty || !saved) { setError("Önce taslağı kaydedin. Metniniz korundu."); return; }
          leave(`/admin/ayin-kitabi/onizleme?ay=${period}&dil=${locale}`);
        }}>Önizle — {locale.toUpperCase()}</button>)}
      </div>
    </form>
    <p role="status" aria-live="polite">{message}</p>
    {error && <div className={styles.notice}><p role="alert">{error}</p><a href="/admin/giris" target="_blank" rel="noopener noreferrer">Ayrı sekmede giriş yap</a></div>}
    {latest && <aside className={styles.notice}><h2>Son kayıt · Sürüm {latest.version}</h2>
      <p>Formunuz yukarıda korunuyor. Gerekirse metninizi kopyalayın; son kayıt aşağıdadır.</p>
      <dl>{(Object.keys(names) as (keyof DraftFields)[]).map((key) => <div key={key}><dt>{names[key]}</dt><dd>{latest[key] || "Boş"}</dd></div>)}</dl>
      <button disabled={busy} onClick={() => { if (window.confirm("Formdaki değişiklikler silinip son kayıt yüklenecek. Devam edilsin mi?")) { setSaved(latest); setValue(fields(latest)); setLatest(null); setError(""); } }}>Son kaydı yükle</button>
    </aside>}
    <div className={styles.actions}><button disabled={busy} onClick={async () => {
      if (dirty && !window.confirm("Kaydedilmemiş değişikliklerle çıkış yapmak istiyor musunuz?")) return;
      setBusy(true);
      try {
        const response = await fetch("/api/auth/sign-out", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
        if (response.ok) {
          skipWarning.current = true;
          // Full navigation discards the authenticated editor and its in-memory draft.
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.assign("/admin/giris");
        }
        else setError("Çıkış yapılamadı. Metniniz korundu.");
      } catch { setError("Çıkış yapılamadı. Metniniz korundu."); }
      finally { setBusy(false); }
    }}>Çıkış yap</button></div>
  </>;
}
