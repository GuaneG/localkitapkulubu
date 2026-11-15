export function Arrow({ direction = "right" }: { direction?: "left" | "right" }) {
  return (
    <svg viewBox="0 0 32 24" aria-hidden="true">
      <path d={direction === "left" ? "M29 12H3m10-9L3 12l10 9" : "M3 12h26M19 3l10 9-10 9"} />
    </svg>
  );
}
