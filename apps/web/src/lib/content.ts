import type { Locale } from "./i18n";

// Demonstration fixtures, not published PO content or database records.
export const copy = {
    tr:{home:'Ana sayfa',about:'Hakkımızda',gallery:'Galeri',contact:'İletişim',join:'Bülten',readCopy:'Bu ay Virginia Woolf ile kendi sesimiz, yazmak ve kendimize açtığımız alanlar üzerine konuşuyoruz. Bir kitap, aynı masanın etrafında farklı düşünceler.',past:'Birlikte okuduklarımız',older:'Daha önce okunan kitapları göster',newer:'Daha yeni okunan kitapları göster',joinTitle:'Bir sonraki kitaptan haberdar ol.',joinText:'Yeni kitaplar ve kulüpten haberler e-postanda. Bültenimiz Türkçe gönderilir.',email:'E-posta',subscribe:'Abone ol',message:'Mesajın',send:'Mesaj gönder',demoResult:'Bu bir tasarım örneği; bilgiler kaydedilmedi ve e-posta gönderilmedi.',aboutTitle:'Hakkımızda',aboutText:'LOCAL., İzmir’de bir araya gelen bir kitap kulübü. Her ay bir kitap seçiyor, aynı masanın etrafında farklı bakışları paylaşıyoruz.',aboutSecond:'Okuduklarımızı, aklımızda kalanları ve birbirimizin cümlelerinde bulduğumuz yeni düşünceleri konuşuyoruz.',goodiesText:'Her buluşmadan küçük bir hatıra: bir kitap ayracı, bir kartpostal ve birlikte çektiğimiz bir polaroid. Kitap bitse de o günün bir parçası bizimle kalıyor.',goodiesAlt:'Bir kitap ayracı, kartpostal ve polaroidin birlikte düzenlendiği temsili kulüp hatıraları',contactText:'Kulüple ilgili bir sorun veya paylaşmak istediğin bir şey varsa bize yaz. Mesajın doğrudan kulübün yöneticisine ulaşır.',albumBack:'Albümlere dön',photoOpen:'Fotoğrafı büyüt',photoClose:'Kapat',previous:'Önceki fotoğraf',next:'Sonraki fotoğraf',demoCover:'Temsili kapak',},
    en:{home:'Home',about:'About',gallery:'Gallery',contact:'Contact',join:'Newsletter',readCopy:'This month, Virginia Woolf brings us together to talk about writing, finding a voice and making room for ourselves. One book, different thoughts around the same table.',past:'Books we read together',older:'Show earlier reads',newer:'Show more recent reads',joinTitle:'Hear about our next read.',joinText:'New books and news from the club, in your inbox. Our newsletter is written in Turkish.',email:'Email',subscribe:'Subscribe',message:'Your message',send:'Send message',demoResult:'This is a design example. No information was saved and no email was sent.',aboutTitle:'About us',aboutText:'LOCAL. is a book club based in İzmir. Each month we choose a book and share different perspectives around the same table.',aboutSecond:'We talk about what stayed with us and the new thoughts we find in one another’s words.',goodiesText:'A little keepsake from every gathering: a bookmark, a postcard and a polaroid we take together. The book ends, but a piece of the day stays with us.',goodiesAlt:'A demonstration arrangement of a bookmark, a postcard and a polaroid',contactText:'Have a question or something to share with the club? Write to us. Your message goes directly to the club organiser.',albumBack:'Back to albums',photoOpen:'Open photograph',photoClose:'Close',previous:'Previous photograph',next:'Next photograph',demoCover:'Concept cover',}
  } as const;

export type Book = { id: number; title: Record<Locale, string>; author: string; palette: readonly [string, string]; readAt: string };

const books: Book[] = [
  {"id": 0, "title": {"tr": "Satranç", "en": "Chess"}, "author": "Stefan Zweig", "palette": ["#ececec", "#262626"], "readAt": "2026-01-01"},
  {"id": 1, "title": {"tr": "Dönüşüm", "en": "The Metamorphosis"}, "author": "Franz Kafka", "palette": ["#262626", "#f3f3f3"], "readAt": "2026-02-01"},
  {"id": 2, "title": {"tr": "Küçük Prens", "en": "The Little Prince"}, "author": "Antoine de Saint-Exupéry", "palette": ["#e1dedb", "#222"], "readAt": "2026-03-01"},
  {"id": 3, "title": {"tr": "Beyaz Geceler", "en": "White Nights"}, "author": "Fyodor Dostoyevski", "palette": ["#e8e8e8", "#333"], "readAt": "2026-04-01"},
  {"id": 4, "title": {"tr": "Yabancı", "en": "The Stranger"}, "author": "Albert Camus", "palette": ["#575757", "#fff"], "readAt": "2026-05-01"},
  {"id": 5, "title": {"tr": "Deniz Feneri", "en": "To the Lighthouse"}, "author": "Virginia Woolf", "palette": ["#d9d9d9", "#222"], "readAt": "2026-06-01"},
  {"id": 6, "title": {"tr": "Siddhartha", "en": "Siddhartha"}, "author": "Hermann Hesse", "palette": ["#e9e3e8", "#3e2635"], "readAt": "2026-07-01"},
  {"id": 7, "title": {"tr": "Hayvan Çiftliği", "en": "Animal Farm"}, "author": "George Orwell", "palette": ["#171717", "#eee"], "readAt": "2026-08-01"},
  {"id": 8, "title": {"tr": "Dalgalar", "en": "The Waves"}, "author": "Virginia Woolf", "palette": ["#efefef", "#303030"], "readAt": "2026-09-01"},
  {"id": 9, "title": {"tr": "Kendine Ait Bir Oda", "en": "A Room of One’s Own"}, "author": "Virginia Woolf", "palette": ["#30242c", "#faf8f9"], "readAt": "2026-10-01"},
];

export const currentRead = { number: 38, book: books[9] };
export const pastReads = books.slice(0, 9).sort((a, b) => b.readAt.localeCompare(a.readAt));
export const photoPositions = ["50% 50%", "10% 45%", "80% 60%", "45% 100%", "20% 35%", "75% 40%"] as const;

export const monthlyCopy = {
  tr: { coverPlaceholder: "Kapak henüz eklenmedi", readUnannounced: "Bu ayın kitabı henüz açıklanmadı.", readUnavailable: "Ayın Kitabı şu anda yüklenemiyor. Lütfen daha sonra yeniden deneyin." },
  en: { coverPlaceholder: "Cover coming soon", readUnannounced: "This month's book has not been announced yet.", readUnavailable: "The book of the month is temporarily unavailable. Please try again later." },
} as const;
