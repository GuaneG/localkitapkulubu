import type { Book } from "@/lib/content";
import { copy } from "@/lib/content";
import type { Locale } from "@/lib/i18n";

export function BookCover({ book, locale }: { book: Book; locale: Locale }) {
  const [background, ink] = book.palette;
  const lines: string[] = [];
  for (const word of book.title[locale].split(" ")) {
    const last = lines.length - 1;
    if (last < 0 || `${lines[last]} ${word}`.length > 15) lines.push(word);
    else lines[last] += ` ${word}`;
  }
  return (
    <span className="book-cover">
      <svg viewBox="0 0 240 360" role="img" aria-label={`${copy[locale].demoCover}: ${book.title[locale]}`} xmlns="http://www.w3.org/2000/svg">
        <rect width="240" height="360" fill={background} />
        <path d="M9 0v360" stroke={ink} opacity=".12" strokeWidth="5" />
        {lines.map((line, index) => <text key={index} x="23" y={45 + index * 25} fill={ink} fontFamily="Courier New,monospace" fontSize="20" fontWeight="400">{line}</text>)}
        {book.id % 3 === 0 ? (
          <path d="M55 267V162a65 65 0 0 1 130 0v105M78 267V170a42 42 0 0 1 84 0v97M101 267V178a19 19 0 0 1 38 0v89" fill="none" stroke={ink} strokeWidth="2" />
        ) : book.id % 3 === 1 ? (
          <g fill="none" stroke={ink} strokeWidth="2"><circle cx="120" cy="214" r="61" /><path d="M70 176l100 78M63 199l112 29M62 222l112-17M77 255l89-81" /></g>
        ) : (
          <path d="M46 247Q120 134 194 247M46 226Q120 113 194 226M46 205Q120 92 194 205" fill="none" stroke={ink} strokeWidth="2" />
        )}
        <text x="23" y="321" fill={ink} fontFamily="Courier New,monospace" fontSize="11" fontWeight="400">{book.author}</text>
      </svg>
    </span>
  );
}
