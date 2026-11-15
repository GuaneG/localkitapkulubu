"use client";

import { useId, useState } from "react";
import { copy } from "@/lib/content";
import type { Locale } from "@/lib/i18n";

export function PreviewForm({ locale, contact = false }: { locale: Locale; contact?: boolean }) {
  const id = useId();
  const [submitted, setSubmitted] = useState(false);
  const t = copy[locale];
  const emailId = contact ? "contact-email" : `email-${id}`;
  return (
    <form className="demo-form" onSubmit={(event) => { event.preventDefault(); setSubmitted(true); }}>
      <label htmlFor={emailId}>{t.email}</label>
      <div className={contact ? undefined : "form-row"}>
        <input id={emailId} type="email" required autoComplete="email" aria-describedby={`result-${id}`} placeholder={contact ? undefined : locale === "tr" ? "sen@ornek.com" : "you@example.com"} />
        {contact && <><label htmlFor={`message-${id}`}>{t.message}</label><textarea id={`message-${id}`} required /></>}
        <button className="button" type="submit">{contact ? t.send : t.subscribe}</button>
      </div>
      <p id={`result-${id}`} className="form-result" role="status">{submitted ? t.demoResult : locale === "tr" ? "Önizleme: Bu form bilgi kaydetmez veya e-posta göndermez." : "Preview: This form does not save information or send email."}</p>
    </form>
  );
}
