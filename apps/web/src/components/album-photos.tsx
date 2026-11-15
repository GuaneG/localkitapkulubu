"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { copy, photoPositions } from "@/lib/content";
import type { Locale } from "@/lib/i18n";

export function AlbumPhotos({ locale }: { locale: Locale }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [photo, setPhoto] = useState(0);
  const t = copy[locale];
  function open(index: number) { setPhoto(index); dialogRef.current?.showModal(); }
  function move(direction: number) { setPhoto((current) => (current + direction + photoPositions.length) % photoPositions.length); }
  return (
    <>
      <div className="photo-grid">
        {photoPositions.map((position, index) => (
          <button key={index} className="photo-tile" type="button" aria-label={`${t.photoOpen} ${index + 1}`} onClick={() => open(index)}>
            <Image className="photo" style={{ objectPosition: position }} src="/images/club-demo.png" alt={`${locale === "tr" ? "Kitap sohbetinden örnek kadraj" : "Sample book conversation crop"} ${index + 1}`} width={1536} height={1024} sizes="(max-width: 600px) 50vw, 360px" loading={index < 3 ? "eager" : "lazy"} />
          </button>
        ))}
      </div>
      <dialog ref={dialogRef} className="lightbox" aria-label={t.photoOpen} onKeyDown={(event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); move(event.key === "ArrowLeft" ? -1 : 1); }
      }}>
        <button className="lightbox-close" type="button" aria-label={t.photoClose} onClick={() => dialogRef.current?.close()}>×</button>
        <button className="photo-prev" type="button" aria-label={t.previous} onClick={() => move(-1)}>‹</button>
        <figure><Image className={photo === 0 ? undefined : "crop"} style={{ objectPosition: photoPositions[photo] }} src="/images/club-demo.png" alt={`${locale === "tr" ? "Örnek kitap sohbeti, kadraj" : "Sample book conversation, crop"} ${photo + 1}`} width={1536} height={1024} sizes="100vw" loading="eager" /></figure>
        <button className="photo-next" type="button" aria-label={t.next} onClick={() => move(1)}>›</button>
      </dialog>
    </>
  );
}
