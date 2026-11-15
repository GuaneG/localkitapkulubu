"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { copy } from "@/lib/content";
import type { Locale } from "@/lib/i18n";
import { Arrow } from "./arrow";

export function BookShelf({ locale, children }: { locale: Locale; children: ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef(0);
  const previousRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const focusAfterUpdate = useRef<HTMLButtonElement | null>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  const t = copy[locale];

  function stop() { cancelAnimationFrame(animationRef.current); }

  useEffect(() => {
    const track = trackRef.current!;
    function refresh() {
      const start = track.scrollLeft <= 1;
      const end = track.scrollLeft >= track.scrollWidth - track.clientWidth - 1;
      setEdges((old) => old.start === start && old.end === end ? old : { start, end });
      if (end && document.activeElement === nextRef.current) focusAfterUpdate.current = previousRef.current;
      else if (start && document.activeElement === previousRef.current) focusAfterUpdate.current = nextRef.current;
    }
    const observer = new ResizeObserver(refresh);
    observer.observe(track);
    track.addEventListener("scroll", refresh, { passive: true });
    window.addEventListener("blur", stop);
    document.addEventListener("visibilitychange", stop);
    return () => {
      stop(); observer.disconnect(); track.removeEventListener("scroll", refresh);
      window.removeEventListener("blur", stop); document.removeEventListener("visibilitychange", stop);
    };
  }, []);

  useEffect(() => {
    focusAfterUpdate.current?.focus({ preventScroll: true });
    focusAfterUpdate.current = null;
  }, [edges]);

  function hover(direction: number) {
    stop();
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || !matchMedia("(hover: hover)").matches) return;
    let last = 0;
    function tick(time: number) {
      const track = trackRef.current;
      if (!track) return;
      if (last) track.scrollLeft += direction * Math.min(time - last, 50) * .25;
      last = time;
      const atEdge = direction > 0 ? track.scrollLeft >= track.scrollWidth - track.clientWidth - 1 : track.scrollLeft <= 1;
      if (!atEdge) animationRef.current = requestAnimationFrame(tick);
    }
    animationRef.current = requestAnimationFrame(tick);
  }

  function scroll(direction: number) {
    stop();
    const track = trackRef.current!;
    track.scrollBy({ left: direction * Math.max(180, track.clientWidth * .75), behavior: "instant" });
  }

  return (
    <section className="read-shelf">
      <div className="wrap"><h2>{t.past}</h2></div>
      <div className="shelf-shell">
        <div className="shelf-track" ref={trackRef} tabIndex={0} aria-label={t.past}>{children}</div>
        <div className="shelf-controls">
          <button ref={previousRef} className="shelf-arrow shelf-prev" type="button" hidden={edges.start} aria-label={t.newer} onPointerEnter={() => hover(-1)} onPointerLeave={stop} onPointerCancel={stop} onClick={() => scroll(-1)}><Arrow direction="left" /></button>
          <button ref={nextRef} className="shelf-arrow shelf-next" type="button" hidden={edges.end} aria-label={t.older} onPointerEnter={() => hover(1)} onPointerLeave={stop} onPointerCancel={stop} onClick={() => scroll(1)}><Arrow /></button>
        </div>
      </div>
    </section>
  );
}
