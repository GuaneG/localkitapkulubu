"use client";
import { useEffect, useRef, useState, useSyncExternalStore, type MouseEvent } from "react";
import { draftFieldNames as names, isEmptyDraft, type AdminDraft, type DraftFields, type DraftSummary } from "@/server/monthly-read/contracts";
import type { Locale } from "@/lib/i18n";
import { MonthlyReadBand } from "@/components/monthly-read-band";
import { AdminPageHeader } from "./components/admin-page-header";
import { AdminButton } from "./components/admin-button";
import { AdminField } from "./components/admin-field";
import { AdminNotice } from "./components/admin-notice";
import { AdminTabs } from "./components/admin-tabs";
import { DraftStatus } from "./components/draft-status";
import { periodLabel, previewRead, savedAt } from "./presentation";
import { navigateAdmin, signOutAdmin } from "./client-actions";
import styles from "./admin.module.css";

function fields(draft: DraftFields | null): DraftFields {
  return { titleTr: draft?.titleTr || "", titleEn: draft?.titleEn || "", author: draft?.author || "", bandTr: draft?.bandTr || "", bandEn: draft?.bandEn || "" };
}
function summary(draft: AdminDraft): DraftSummary {
  return { period: draft.period, titleTr: draft.titleTr, titleEn: draft.titleEn, version: draft.version, updatedAt: draft.updatedAt, publication: draft.publication, isEmpty: isEmptyDraft(draft) };
}
const languages = [{ value: "tr", label: "Türkçe" }, { value: "en", label: "İngilizce" }] as const;
const views = [{ value: "live", label: "Anlık önizleme" }, { value: "saved", label: "Son kayıt" }, { value: "published", label: "Bu ayın yayını" }] as const;
type View = typeof views[number]["value"];
const subscribeReady = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

export function DraftEditor({ period, initial, initialSummaries, listError }: { period: string; initial: AdminDraft | null; initialSummaries: DraftSummary[]; listError: string | null }) {
  // SSR fields must not accept input before React attaches their handlers.
  const ready = useSyncExternalStore(subscribeReady, clientReady, serverReady);
  const [saved, setSaved] = useState(initial), [value, setValue] = useState(() => fields(initial));
  const [summaries, setSummaries] = useState(initialSummaries);
  const [selectedMonth, setSelectedMonth] = useState(period);
  const [locale, setLocale] = useState<Locale>("tr"), [view, setView] = useState<View>("live");
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [error, setError] = useState("");
  const [latest, setLatest] = useState<AdminDraft | null>(null);
  const skipWarning = useRef(false), sending = useRef(false), monthRef = useRef<HTMLInputElement>(null);
  const dirty = JSON.stringify(value) !== JSON.stringify(fields(saved));
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty && !skipWarning.current) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function leave(url: string) {
    if (busy || (dirty && !window.confirm("Kaydedilmemiş değişiklikleriniz var. Ayrılmak istiyor musunuz?"))) return;
    skipWarning.current = true; navigateAdmin(url);
  }
  function follow(event: MouseEvent<HTMLAnchorElement>, url: string) { event.preventDefault(); leave(url); }
  function change(key: keyof DraftFields, next: string) { setValue((old) => ({ ...old, [key]: next })); setView("live"); setMessage(""); }
  function remember(draft: AdminDraft) {
    setSaved(draft); setValue(fields(draft));
    setSummaries((old) => [summary(draft), ...old.filter((row) => row.period !== draft.period)].sort((a, b) => b.period.localeCompare(a.period)));
  }
  async function save() {
    if (sending.current) return;
    setError(""); setMessage("");
    if (isEmptyDraft(value)) { setError("Taslağı kaydetmek için kitap adı, yazar veya şerit alanlarından en az birini doldurun."); return; }
    sending.current = true; setBusy(true); setLatest(null);
    try {
      const response = await fetch(`/api/admin/ayin-kitabi/${period}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...value, expectedVersion: saved?.version ?? null }) });
      if (response.ok) { remember(await response.json()); setMessage("Taslak kaydedildi. Yayındaki içerik değişmedi."); }
      else if (response.status === 401) setError("Oturumunuz sona erdi. Ayrı sekmede yeniden giriş yapın. Metniniz korundu.");
      else if (response.status === 409) {
        setError("Taslak başka bir oturumda kaydedildi veya değişti. Metniniz korundu.");
        const current = await fetch(`/api/admin/ayin-kitabi/${period}`, { cache: "no-store" });
        if (current.ok) setLatest(await current.json());
      } else if (response.status === 422) setError("Taslağı kaydetmek için en az bir içerik alanını doldurun. Metniniz korundu.");
      else setError("Taslak kaydedilemedi. Alan uzunluklarını ve bağlantınızı kontrol edin. Metniniz korundu.");
    } catch { setError("Sunucuya ulaşılamadı. Metniniz korundu; yeniden deneyin."); }
    finally { sending.current = false; setBusy(false); }
  }
  async function logout() {
    if (busy || (dirty && !window.confirm("Kaydedilmemiş değişikliklerle çıkış yapmak istiyor musunuz?"))) return;
    setBusy(true); setError("");
    try { await signOutAdmin(); skipWarning.current = true; navigateAdmin("/admin/giris"); }
    catch { setError("Çıkış yapılamadı. Metniniz korundu."); setBusy(false); }
  }
  const source = view === "live" ? value : view === "saved" ? saved : saved?.published;
  const preview = source ? previewRead(source, period, locale) : null;
  const previewCaption = view === "live" ? dirty ? "Henüz kaydedilmedi" : saved ? "Son kayıtla aynı" : "Henüz kayıt yok" : view === "saved" ? saved ? `Son kayıt: ${savedAt(saved.updatedAt)}` : "Bu ay için henüz kaydedilmiş taslak yok." : saved?.published ? `Bu aya ait yayın: ${savedAt(saved.published.publishedAt)}` : "Bu ay henüz yayınlanmadı.";
  return <div className={styles.editor} data-saved-version={saved?.version ?? ""}>
    <AdminPageHeader title="Ayın Kitabı" subtitle={periodLabel(period)} navigation={<>
      {/* Full navigation deliberately shares the editor's dirty-form guard. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/admin" onClick={(event) => follow(event, "/admin")}>Ana menü</a>
      <a href="/tr" target="_blank" rel="noopener noreferrer">Siteyi aç</a>
      <AdminButton disabled={busy} onClick={() => void logout()}>Çıkış yap</AdminButton>
    </>} />
    <div className={styles.workspace}>
      <aside className={styles.sidebar}>
        <h2>Kayıtlı taslaklar</h2>
        {listError ? <AdminNotice kind="error">{listError}</AdminNotice> : summaries.length === 0 ? <p>Henüz kayıtlı taslak yok. Bir ay seçip ilk içeriğinizi kaydedin.</p> : <nav aria-label="Kayıtlı taslaklar" className={styles.draftList}><ul>
          {summaries.map((row) => <li key={row.period}><a href={`/admin/ayin-kitabi?ay=${row.period}`} aria-current={row.period === period ? "page" : undefined} onClick={(event) => follow(event, `/admin/ayin-kitabi?ay=${row.period}`)}>
            <strong>{periodLabel(row.period)}</strong><span>{row.titleTr || row.titleEn || "Kitap adı girilmedi"}</span><DraftStatus draft={row} />
          </a></li>)}
        </ul></nav>}
        <AdminButton disabled={busy} onClick={() => monthRef.current?.focus()}>+ Yeni ay</AdminButton>
        <label htmlFor="month">Okuma ayı</label><input ref={monthRef} id="month" type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} disabled={busy} />
        <AdminButton disabled={busy || !/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(selectedMonth)} onClick={() => leave(`/admin/ayin-kitabi?ay=${selectedMonth}`)}>Ayı aç</AdminButton>
      </aside>
      <div className={styles.workarea}>
        <div className={styles.stateBar}><span>{dirty ? "Kaydedilmemiş değişiklikler var" : saved ? "Taslak kaydedilmiş durumda" : "Bu ay için henüz kayıt yok"}</span><span>{saved ? `Son kayıt: ${savedAt(saved.updatedAt)}` : "Henüz kaydedilmedi"}</span></div>
        <div className={`${styles.editGrid} ${expanded ? styles.expanded : ""}`}>
          <form id="draft-form" hidden={expanded} onSubmit={(event) => { event.preventDefault(); void save(); }}>
            <fieldset disabled={busy || !ready}>
              <AdminField id="author" label={names.author} value={value.author} maxLength={300} onChange={(event) => change("author", event.target.value)} />
              <AdminTabs id="language" label="İçerik dili" items={languages} value={locale} onChange={setLocale} />
              {languages.map((language) => <section key={language.value} role="tabpanel" id={`language-${language.value}-panel`} aria-labelledby={`language-${language.value}-tab`} hidden={locale !== language.value}>
                <AdminField id={`title${language.value}`} label={language.value === "tr" ? names.titleTr : names.titleEn} value={language.value === "tr" ? value.titleTr : value.titleEn} maxLength={300} onChange={(event) => change(language.value === "tr" ? "titleTr" : "titleEn", event.target.value)} />
                <AdminField multiline id={`band${language.value}`} label={language.value === "tr" ? names.bandTr : names.bandEn} value={language.value === "tr" ? value.bandTr : value.bandEn} maxLength={5000} onChange={(event) => change(language.value === "tr" ? "bandTr" : "bandEn", event.target.value)} />
              </section>)}
            </fieldset>
          </form>
          <section className={styles.previewArea} aria-label="İçerik önizlemesi">
            <AdminTabs id="preview" label="Önizleme kaynağı" items={views} value={view} onChange={setView} />
            <p className={styles.caption}>{locale === "tr" ? "Türkçe" : "İngilizce"} · {previewCaption}</p>
            {views.map((item) => <div key={item.value} role="tabpanel" id={`preview-${item.value}-panel`} aria-labelledby={`preview-${item.value}-tab`} hidden={view !== item.value}>
              {view === item.value && (preview ? <MonthlyReadBand locale={locale} read={preview} /> : <AdminNotice>{previewCaption}</AdminNotice>)}
            </div>)}
            <AdminButton onClick={() => setExpanded((old) => !old)}>{expanded ? "Düzenlemeye dön" : "Önizlemeyi büyüt"}</AdminButton>
            <p className={styles.caption}>Yerleşim önizlemesi bu alana sığdırılmıştır. Kaydetmek veya yayınlamak değildir.</p>
          </section>
        </div>
        <div className={styles.editorFooter}>
          <div><div className={styles.actions}>
            <AdminButton form="draft-form" type="submit" variant="primary" disabled={busy || !ready}>{busy ? "Kaydediliyor…" : "Taslağı kaydet"}</AdminButton>
            <AdminButton disabled={busy || !saved || dirty} aria-describedby="preview-help" onClick={() => leave(`/admin/ayin-kitabi/onizleme?ay=${period}&dil=${locale}`)}>Yayın öncesi son kontrol</AdminButton>
          </div><p id="preview-help" className={styles.caption}>{dirty || !saved ? "Son kontrolden önce taslağı kaydedin. Kaydetmek, yayındaki içeriği değiştirmez." : "Son kontrol yalnız kaydedilmiş sürümü gösterir."}</p></div>
          <div><DraftStatus draft={saved ? summary(saved) : null} /><p>{saved?.publication ? saved.publication.sourceVersion === saved.version ? "Bu kaydedilmiş taslak yayınlanmış durumda." : "Son kaydettiğiniz değişiklikler henüz yayınlanmadı." : "Bu ay henüz yayınlanmadı."}</p><p className={styles.caption}>Ana sayfa İstanbul saatine göre güncel ayı gösterir. Diğer ayların yayınları bu ayın ana şeridini değiştirmez.</p></div>
        </div>
        <AdminNotice kind="success">{message}</AdminNotice>
        {error && <AdminNotice kind="error"><p>{error}</p><a href="/admin/giris" target="_blank" rel="noopener noreferrer">Ayrı sekmede giriş yap</a></AdminNotice>}
        {latest && <aside className={styles.conflict}><h2>Son kayıt</h2><p>Formunuz yukarıda korunuyor. Gerekirse metninizi kopyalayın; son kayıt aşağıdadır.</p>
          <dl>{(Object.keys(names) as (keyof DraftFields)[]).map((key) => <div key={key}><dt>{names[key]}</dt><dd>{latest[key] || "Boş"}</dd></div>)}</dl>
          <AdminButton disabled={busy} onClick={() => { if (window.confirm("Formdaki değişiklikler silinip son kayıt yüklenecek. Devam edilsin mi?")) { remember(latest); setLatest(null); setError(""); } }}>Son kaydı yükle</AdminButton>
        </aside>}
      </div>
    </div>
  </div>;
}
