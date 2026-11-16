# Ayın Kitabı yayınlama — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking. 16 Kasım kullanıcı isteğiyle uygulandı. Commit, push ve deploy yapılmadı; canlı kabul ayrıdır.

**Goal:** PO, kaydettiği TR/EN taslağı özel önizlemeden yayımlayabilsin; sonraki taslak değişiklikleri ziyaretçinin son yayınını değiştirmesin.

**Architecture:** Yayın, iki dili içeren değişmez bir snapshot ve ay başına güncel snapshot referansını aynı PostgreSQL transaction'ında kaydeder. Her yeni ana sayfa sunucu isteği referansları primary DB'den taze okur; yalnız değişmez içerik yayın kimliğiyle önbelleğe alınır. Doğruluk için cache silme veya ayrı bir yenileme iş akışı gerekmez.

**Tech Stack:** Mevcut Next.js 16.4.2 App Router, TypeScript, Better Auth, Drizzle/PostgreSQL (canlıda Neon), pnpm, node:test ve Playwright. Yeni paket veya servis yok.

**Spec:** [Paylaşılabilir mimari kararlar](../../MONTHLY_READ_DECISIONS.md#mimari-ve-ödünleşimler), [içerik/yayın kuralları](../../MONTHLY_READ_DECISIONS.md#içerik-ve-yayın-kuralları), [yerel kabul](../../MONTHLY_READ_DECISIONS.md#yerel-kabul), [ilk admin teslimi](../../ADMIN_FIRST_DELIVERY.md), [çalışma kuralları](../../MONTHLY_READ_DECISIONS.md#giriş-ve-çalışma-kuralları).

**Plan tarihi:** 15 Kasım 2026. **Uygulama / yerel kabul:** 16 Kasım 2026; unit 7/7, entegrasyon 6/6, development ve production Playwright 15/15, lint/typecheck/build geçti. [Gerçek test sonuçları ve sınırlar](../../MONTHLY_READ_PUBLISHING_DELIVERY.md).

**Plan aşamasının kaydı (15 Kasım):** Ürün kapsamı kullanıcı kararlarına dayanır. Aşağıdaki veri modeli, arayüzler ve hata yönetimi uygulanmak üzere seçilen teknik yaklaşımdır; uygulama veya test sonucu değildir. GPT-6 Astra / `uzman` rolü sadeleştirmeyi salt okunur takip incelemesinde destekledi.

## Global Constraints

- Tek `apps/web`; mevcut yetki kontrolleri, admin stilleri, ayrı Türkçe `/admin` kök layout'u ve public TR/EN layout korunur.
- Taslağı kaydetmek yayınlamak değildir. Admin okuma, önizleme, durum ve yayın işlemleri sunucuda `requireAdmin` kullanır; yazmada mevcut origin kontrolü uygulanır. Admin yanıtları `private, no-store`, `noindex` kalır.
- Yayın için `titleTr`, `titleEn`, `author`, `bandTr`, `bandEn` trim sonrası boş olamaz; mevcut uzunluk sınırları geçerlidir. İki dilin başlığı aynı olabilir. Taslak eksik kaydedilebilir.
- Kapak yer tutucusu kullanılabilir; şerit başlığı numarasızdır. Gerçek kapak yükleme ve okuma numarası otomasyonu yayını engellemez, ayrı teslimdir.
- Güncel dönem `Europe/Istanbul` ile istek anında bulunur. O ay yayımlanmamışsa iki dilde açıklanmamış, bağlantısız görünüm; önceki kitap güncel yerine gösterilmez. Gelecek yayınlar erken görünmez.
- Ay başına tek taslak ve tek güncel yayın referansı korunur. Kitap kataloğu/seçimi ve aynı kitabın başka aya atanmasını engelleme ayrı takip işidir; başlık eşitliğinden kitap kimliği türetilmez. Bu teslim bu ürün kuralının tamamını uygulanmış saymaz.
- Tam otomatik ay geçişi, gece yarısı/Aralık–Ocak uçtan uca kabulü, yayından kaldırma, galeri, mail ve genel CMS kapsam dışıdır. Temel İstanbul ay seçimi bu teslimde test edilir.

## Plan hazırlanırken mevcut kod ve kanıt (15 Kasım)

| Kaynak | Bugünkü davranış / planın dayanağı |
| --- | --- |
| `apps/web/src/server/monthly-read/repository.ts:7`, `:12`, `:24` | Taslak mutable kitapla join edilir; kayıt transaction ve sürüm karşılaştırması kullanır. Yayın için bu join kullanılamaz. |
| `apps/web/src/server/db/schema.ts:23`, `:26` | Mutable kitap ve dönem unique taslak mevcut; yayın snapshot'ı/referansı yok. |
| `apps/web/src/server/monthly-read/service.ts:7` | Admin sunucu yetki kontrolü mevcut, yeniden kullanılacak. |
| `apps/web/src/app/admin/ayin-kitabi/onizleme/page.tsx:5`, `:18` | Özel önizleme kaydedilmiş taslağı gösterir; mevcut `#—` bu kapsamda kaldırılacak. |
| `apps/web/src/components/pages.tsx:12`, `:18` | Home bugün statik `currentRead`/`pastReads` demo verisini gösterir. |
| `apps/web/src/app/[locale]/[[...segments]]/page.tsx:9`, `:28` | Ortak route statik parametre üretir; Home'un request-time veri akışı henüz yok. |
| `apps/web/next.config.ts:8` | Admin no-store başlıkları var; public HTML/RSC için bu planın garantisi henüz uygulanmış değil. |
| `apps/web/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/connection.md:14`, `unstable_cache.md:52` | `connection()` prerender'ı durdurur; cache anahtarına fonksiyon argümanları dahildir. |
| `apps/web/node_modules/next/dist/server/web/spec-extension/unstable-cache.js:77` | Gerçek cache anahtarı argümanları içerir; A'nın gecikmiş yazımı B kimliğinin kaydını değiştiremez. |

## Seçenekler ve sadeleştirme

| Seçenek | Değerlendirme |
| --- | --- |
| Mutable taslağa `published` işareti | Sonraki kayıt A'yı değiştirebilir; reddedildi. |
| Güncel referansı cache'lemek, invalidation + `pendingRevisionId` + doğrulama/yeniden deneme | Başarısız invalidation eski referansı görünür tutabilir. Ek durum, CAS, endpoint ve işletim akışı gerekir. İlk öneri bu hata içindi; taze referans tasarımında bırakıldı. |
| **Taze DB referansı + immutable yayın cache'i** | Seçilen yaklaşım. Her Home isteğinde küçük DB sorgusu ve DB erişilebilirliği maliyeti vardır; doğruluk cache yenileme zamanlamasına bağlı kalmaz. |

`pendingRevisionId`, özel cache yenileme/sonuç doğrulama endpoint'i, probe düğmesi, worker/outbox ve doğruluk için `revalidateTag`/`revalidatePath` bu teslimde **yoktur**. Commit B'yi etkinleştirdiyse sonraki istek B kimliğini okur; B cache'te yoksa B snapshot'ını DB'den yükler. Eski A refill'i yalnız A anahtarına yazar. Commit'ten sonra süreç kapanması bu seçimi bozmaz. TR ve EN tek snapshot'a ve aynı referansa dayanır; iki ayrı dil cache'inin tamamlanmasını bekleyen bir durum yoktur.

Garanti, commit sonrasında başlayan yeni sunucu istekleri içindir. Açık sekmeler, önceden başlamış yanıtlar ve tarayıcıdaki eski RSC/prefetch kendiliğinden güncellenmez. İki dil isteği arasına başka bir yayın girerse farklı yayınların görülmesi mümkündür; dağıtık iki HTTP isteğine atomik görüntü garantisi verilmez.

## Veri ve işlem sözleşmesi

- `monthly_read_revision`: `id` UUID PK, `draftId`, `period`, `sourceVersion`, TR/EN başlık, ortak yazar, TR/EN şerit, `publishedAt`. `UNIQUE(draftId, sourceVersion)` ve pozitif sürüm; alanlar snapshot içinde kopyadır. Normal uygulama işlemlerinde güncellenmez/silinmez; eski mutable `book` kaydından alan okunmaz.
- `monthly_read_publication`: `period` PK, `revisionId` FK. Dönem/revizyon eşleşmesini composite FK ile koru: revision tarafında `UNIQUE(period, id)`, publication `(period, revisionId)` bu çifte referans verir. Eksik referans henüz yayın yok demektir.
- Mevcut `Draft` alanlarına yetkili okuma/kayıt yanıtında `publication: PublicationReceipt | null` ekle. `PublicationReceipt = {revisionId: string; sourceVersion: number; publishedAt: string}`. Editör bu durumla son yayın ile yeni taslağı ayırt eder; public DTO'ya admin/taslak sürüm bilgisi eklenmez.
- `PublishedRevision = DraftFields & {id: string; period: string; sourceVersion: number; publishedAt: string}` sunucu içi snapshot tipidir. `PublicRead = {revisionId: string; period: string; title: string; author: string; band: string}` lokalize sunum tipidir; dönem dışarıda `YYYY-MM` biçimindedir. `readPublishedReferences(db, currentPeriod): Promise<Array<{period: string; revisionId: string}>>` yalnız `period <= currentPeriod` seçer; current/past ayrımı bu sonuç üzerinde yapılır.
- `PublishInput = {expectedVersion: number}`; gövde tam bu alanı ve pozitif tamsayıyı kabul eder. Client alanları yayına göndermez; transaction kaydedilmiş taslağı okur. `publishAdminDraft(headers, period, input): Promise<PublicationReceipt>` mevcut service içinde; `publishDraft(db, period, input)` repository içinde.
- Transaction sırası: dönem taslak satırını `FOR UPDATE` kilitle → **önce** `expectedVersion` karşılaştır → kaydedilmiş kitap/şerit alanlarını oku ve ortak yayın doğrulamasını çalıştır → aynı kaynak sürümün revision'ı varsa onu döndür, referansı yeniden yazma → yoksa snapshot insert ve dönem referansını upsert et → commit. Save mevcut dönem satırını güncellemeden kitap alanlarını değiştirmez; iki yol aynı kilit sırasını korur.
- Sürüm uyuşmazlığı `409`, eksik/yayımlanamaz taslak `422`, yetkisizlik mevcut `401/403`. Başarılı ilk yayın ve aynı sürümün güvenli tekrarı `200` + aynı receipt. Yayın taslak sürümünü artırmaz.
- `POST /api/admin/ayin-kitabi/[period]/yayin` Node.js, dinamik ve private/no-store. `GET /api/admin/ayin-kitabi/[period]` durum için yeterlidir; yeni retry/status endpoint'i yok.

## Gerçek hata yolları

| Hata | Davranış ve toparlanma |
| --- | --- |
| Commit öncesi snapshot/referans yazımı başarısız | Tam rollback; A etkin kalır, B taslağı önceki başarılı kaydıyla korunur. Başarı gösterilmez. |
| Commit başarılı, HTTP yanıtı kayıp | Ziyaretçi yeni istekte B'yi görür. Admin sonucu belirsiz gösterir; yetkili GET/reload receipt'i okur. Aynı `expectedVersion` ile normal yayın isteği tekrarı aynı receipt'i verir, ikinci snapshot oluşturmaz. Bu **istek tekrarıdır**, cache yenilemesi değildir. |
| Yanıtı kaybolan A isteği B taslağı kaydedildikten/yayımlandıktan sonra tekrarlanır | Önce sürüm kontrolü nedeniyle `409`; B'nin referansı A'ya dönmez. Otomatik olarak yeni sürümle tekrar yayınlama yapılmaz; güncel taslak tekrar önizlenir. |
| Immutable içerik cache miss / cache altyapısı hatası | Seçilmiş aynı `revisionId` DB'den okunur. Cache arızasında doğrudan aynı snapshot okumasına düş; taslak veya rastgele eski sürüme düşme. Yeni cache servisi/retry altyapısı ekleme. |
| Referans/snapshot DB okuması başarısız veya referans bozuk | İki dilde geçici erişim hatası göster; bunu “bu ay açıklanmadı” şeklinde yorumlama. DB düzelince sonraki normal istek tekrar okur. Invalidation düğmesi DB arızasını gidermez. |

## Public veri akışı ve yeniden kullanım

Home dalında `await connection()` **ay hesabından ve DB sorgusundan önce** çağrılır. `readPublishedReferences(db, currentPeriod)` tek fresh primary DB sorgusuyla güncel dönemin ve geçmiş rafın dönem/revizyon referanslarını seçer; bu fonksiyon `unstable_cache`, `use cache`, modül değişkeni veya paylaşımlı memo içinde çalışmaz. Geçmiş raf yalnız `period < currentPeriod` yayınları, en yeni önce sırasıyla kullanır; geleceği/taslağı/demo kayıtları katmaz. Boşsa raf gizlenir.

`readPublishedRevision(db, revisionId): Promise<PublishedRevision | null>` yalnız revision tablosunu okur. `public.ts` içindeki `getPublishedRevision(revisionId)` mevcut Next `unstable_cache` API'sini sabit bir namespace ve **argüman olarak revisionId** ile kullanır; değişmez payload için süreye bağlı doğruluk yoktur. Yetki, headers/cookies, ay hesabı ve referans okuma cache callback'ine girmez. `getPublicMonthlyRead(locale): Promise<{current: PublicRead | null; past: PublicRead[]}>` referansları seçer, bu kimliklerle içeriği yükler ve yayınlanmış alanları sunum DTO'suna çevirir.

`/tr`, `/en` ana sayfa HTML/RSC çıktıları Full Route veya ortak CDN cache'inden sunulmaz; framework'ün dinamik çıktısını production build'de doğrula ve ana sayfa yollarıyla sınırlı `Cache-Control: no-store` başlığını mevcut config'e ekle. Netlify'nin bu HTML/RSC başlıklarını uyguladığı canlıya yakın ortamda ayrıca doğrulanır. Diğer public sayfaların veri akışı/layout'una genel dinamik ayar ekleme; mevcut catch-all route'un build çıktısındaki etkisini kontrol et.

`MonthlyReadBand` ve `MonthlyReadCover` saf sunum bileşenleri çıkar: preview ve Home aynı şerit/yer tutucuyu, geçmiş raf aynı kapağı kullanır. DTO yalnız gösterilecek lokalize başlık/yazar/metni taşır; auth, yayın ve DB mantığı bileşene girmez. Mevcut şerit/raf CSS'si, `BookShelf`, admin form/buton/hata stilleri, `requireAdmin`, HTTP hata/origin yardımcıları yeniden kullanılır. Demo `Book` tipine uymak için sahte sayısal ID/palet üretme.

## Review Focus

1. B'nin gerçekten kaydedilip reload sonrası kalması; yalnız formda değiştirilmiş B ile yanlış olumlu test olmaması — Görev 4.
2. Save/publish yarışı ve A'nın geç tekrarı B'yi ezmemeli — Görev 1 ve 2.
3. Commit sonrası yanıt kaybı “yayın olmadı” varsayımıyla ikinci etki yaratmamalı — Görev 2 ve 4.
4. Geciken A cache yazımı veya önceden ısınmış TR/EN HTML/RSC B'yi gizlememeli — Görev 3 ve 4.
5. DB arızası açıklanmamış ay gibi görünmemeli; ay filtresi geleceği/önceki kitabı güncel yapmamalı — Görev 3.

## Uygulama adımları

### Görev 1 — Değişmez yayın ve atomik işlem

**Dosyalar:** değiştir `apps/web/src/server/db/schema.ts`, `src/server/monthly-read/{contracts,repository}.ts`; oluştur `apps/web/drizzle/0001_monthly_read_publication.sql` ve mevcut migration metadata'sını güncelle (numara uygulama başlangıcında yeni migration varsa sıradakine uyarlanır). Test: mevcut `apps/web/test/unit/contracts.test.ts`, `test/integration/storage.test.ts`.

**Arayüzler:** yukarıdaki `PublishInput`, `PublicationReceipt`, genişleyen `Draft`, `publishDraft`, `readPublishedReferences`, `readPublishedRevision`. Ortak `publicationIssues(fields: DraftFields): string[]` önizleme ve publish tarafından kullanılır; kayıt parser'ı eksik taslağa izin vermeye devam eder.

- [x] Trim/uzunluk, eksik TR veya EN, ay başına iki ilk kayıt, immutable A + kayıtlı B, transaction rollback, aynı sürüm çift yayın ve save/publish kilit yarışını kanıtlayan testleri ekle ve doğrula (RED kaydının kapsamı aşağıdadır).
- [x] Şema/migration ve kilitli transaction'ı uygula. Save önce kilit/sürüm kontrolü yapar; publish snapshot'ı kilitli kaydedilmiş sürümden alır. A receipt'i ile B kaydından sonraki yayın tekrarı `409` olmalı.
- [x] Unit testleri ve ayrılmış yerel PostgreSQL entegrasyon testlerini çalıştır; yalnız bir aylık taslak, tek kaynak sürüm snapshot'ı ve doğru referans kaldığını DB'den doğrula. İki yarış sırasını da deterministik bariyerlerle çalıştır; zamanlamaya bağlı sleep kullanma.

### Görev 2 — Yetkili önizlemeden yayın

**Dosyalar:** değiştir `apps/web/src/server/monthly-read/service.ts`, `src/app/admin/{load-draft.ts,draft-editor.tsx}`, `src/app/admin/ayin-kitabi/onizleme/page.tsx`; oluştur `src/app/api/admin/ayin-kitabi/[period]/yayin/route.ts`, `src/app/admin/publish-button.tsx`. Test: mevcut `apps/web/e2e/admin.spec.ts` ve entegrasyon testleri.

**Arayüzler:** `publishAdminDraft(headers, period, input)` ve yukarıdaki POST; GET/save yanıtında `Draft.publication`. Preview button yalnız görüntülenen kaydedilmiş sürümün `expectedVersion` değerini gönderir.

- [x] Yetkisiz POST, yanlış origin, eksik alan, preview açıldıktan sonra başka oturumun kaydı ve çift tıklama/yanıt kaybı testlerini ekle ve doğrula. Güvenlik ek testleri uygulama sonrası genişletildi; gözlenen RED kapsamı aşağıda açıkça kayıtlıdır.
- [x] Editörde mevcut kaydet/önizleme ve kirli form korumasını kullan. Yayın düğmesini kaydedilmiş özel önizlemede sun; iki dil linkleri ve ortak doğrulamanın eksik alan listesi görünür olsun. Ayrı “önizlendi” DB durumu veya imzalı token ekleme. API yine tüm kuralları uygular.
- [x] İstek sürerken düğmeyi kilitle; başarıda receipt göster. `409` güncel taslağı yeniden yükleme/önizleme ister; formu sessizce ezmez. Ağ hatasında GET ile son durumu öğrenme veya aynı sürümle tekrar gönderme mümkün olsun; otomatik yeni sürüm yayımlama yok.
- [x] Mevcut admin yetki/giriş/oturum testlerini koruyarak yeni akış testlerini çalıştır. Girişin 15 dakika/5 başarısız deneme kuralını ve ayrı Türkçe layout'u değiştirme.

### Görev 3 — Ziyaretçiye güncel yayını seçme

**Dosyalar:** oluştur `apps/web/src/server/monthly-read/public.ts`, `src/components/monthly-read-band.tsx`, `src/components/monthly-read-cover.tsx`; değiştir `src/components/pages.tsx`, `src/app/[locale]/[[...segments]]/page.tsx`, `src/app/admin/ayin-kitabi/onizleme/page.tsx`, `src/lib/content.ts` (yalnız gerekli iki dilde placeholder/hata metinleri), `next.config.ts`. Test: oluştur `apps/web/test/unit/publication.test.ts`, mevcut storage entegrasyonu ve E2E.

**Arayüzler:** yukarıdaki `getPublicMonthlyRead(locale)`; saf bileşenler `{locale, read: PublicRead | null}` / `{locale, read: PublicRead}` alır. Taslak okuması yalnız admin dalında kalır.

- [x] İstanbul güncel ay, boş ay, yalnız geçmiş/gelecek yayın, DB arızası ve yayının mutable kitap değişiminden etkilenmemesi testlerini ekle ve doğrula (RED kaydının kapsamı aşağıdadır). Unit testleri saf alan/dönem kurallarını hedeflesin; `server-only`/Next request context gerektiren okumaları mevcut `--conditions=react-server` entegrasyon veya production E2E ortamında çalıştır.
- [x] Fresh referans ve immutable payload akışını, Home'a özgü request-time davranışını ve ortak sunumu uygula. Demo Home verisini gerçek yayın yokluğunda kullanma; diğer public sayfaların etkileşimlerini koru.
- [x] A payload cache okumasını/yazmasını deterministik olarak beklet, B'yi commit et, A yazımını tamamlat; sonraki referans okuması ve iki dil sonucu B olmalı. Cache miss/cache hatasında aynı B ID'sinin DB'den okunduğunu; referans DB hatasında eski A'ya/taslağa düşülmediğini doğrula. Test için production fault endpoint'i kurma.
- [x] Production build/start ile HTML ve gerçek RSC isteklerini iki dilde kontrol et. Isıtılmış yanıtlar sonraki B isteğini eski A'ya sabitlememeli; public yanıtlar draft alanlarını içermemeli. Netlify/Neon kontrolü yapılmadan yerel sonucu canlı kabulü diye işaretleme.

### Görev 4 — Kalıcı B ve anonim A/B kabulü

**Dosyalar:** mevcut `apps/web/e2e/admin.spec.ts`; gerekirse yayın akışını `apps/web/e2e/publication.spec.ts` içine ayır. Mevcut ayrı kabul DB'si hazırlığını/test yardımcılarını kullan. Gerçek geliştirme veya Neon işletim DB'sini bu testlere verme.

- [x] Ayrı test DB'sinde İstanbul'a göre **o anki ay** için iki dilde benzersiz işaretleri olan A'yı kaydet, özel önizlemeden yayımla. Ayrı, cookiesiz browser context'te `/tr` ve `/en` için A'yı doğrula.
- [x] Admin oturumunda aynı ayın başlıklarını, yazarını ve TR/EN şeridini benzersiz B değerleriyle değiştir. Gerçek PUT isteğinin ve kayıt başarısının tamamlanmasını bekle; save yanıtını mock'lama.
- [x] **Editörü yeniden yükle.** Alanların tamamının B, sürümün kayıt yanıtındaki sürüm olduğunu doğrula; özel TR/EN önizlemeler B'yi göstersin. Bu kontrol kalıcı DB kaydını kanıtlar; yalnız kirli form yeterli değildir.
- [x] Admin cookie'lerini paylaşmayan yeni context'te `/tr` ve `/en` sayfalarını yeniden aç. Her iki dilde A görünür; B işaretleri HTML/RSC yanıtında yoktur. B kaydı public referansı değiştirmemiş olmalı.
- [x] B'nin kaydedilmiş önizlemesinden yayımla. Yeni anonim sunucu isteklerinde her iki dil B; A artık güncel şeritte yoktur. Ayrı past fixture varsa geçmiş raf yalnız yayımlanmış doğru sürümü gösterir. Boş ay ve numarasız başlık/kapak yer tutucusu da doğrulanır.
- [x] Publish commit sonrası yalnız HTTP yanıtını kaybettir: anonim TR/EN B, admin reload receipt B; aynı sürüm isteğini tekrar gönderince aynı revision ID ve tek snapshot. A'nın eski isteğini B kaydından/yayınından sonra tekrar gönderince `409`, güncel referans B.
- [x] İki oturumun stale save/publish, çift POST ve transaction rollback kontrollerini de çalıştır; aynı taslak için B'nin üstüne eski alan yazılmadığını doğrula.

### Görev 5 — Doğrulama ve teslim kaydı

- [x] Repo kökünde `pnpm lint`, `pnpm typecheck`, `pnpm test:unit`, `pnpm build` çalıştır. Ayrılmış DB ile `./scripts/test-postgres.ps1` (PowerShell'de `.\scripts\test-postgres.ps1`) ve ayrı hazırlanmış kabul DB'siyle `pnpm test:e2e` çalıştır; production start akışını da kapsa. PostgreSQL script'i Playwright kabul DB'sini hazırlamaz.
- [ ] Netlify/Neon ortamı ayrıca yetkilendirildiğinde taze anonim TR/EN HTML/RSC, no-store, commit sonrası yeni sürüm ve bağlantı hatasından toparlanmayı doğrula. Bu tur servis kurma veya deploy yapma. Atlanan ortam farklarını açık bırak.
- [x] Gerçek sonuçları `ADMIN_FIRST_DELIVERY.md` yerine yeni yayın teslimi kaydında tut; README/kullanım, SESSION_NOTES, NEXT_STEPS, OPEN_QUESTIONS, OPERATIONS_DECISIONS ve ACCEPTANCE_CHECKLIST durumlarını kanıtla güncelle. Ürün kararı, uygulama, yerel test ve canlı kabul ayrı işaretlenir.

## Karar ve teslim sınırı

İlk küçük teslim bu planın atomik yayın + özel önizleme + iki dilde Home akışıdır; kabul kapısı Görev 4'teki kalıcı B testidir. Kullanıcıdan bu kapsam için yeni PO kararı gerekmiyor. Gerçek TR/EN içerik PO tarafından sağlanacak. Kapak kaynağı/yükleme, numara yönetimi, kitap seçimi/tekrar atama yasağının kimlikle uygulanması ve tam ay geçişi sonraki işlerdir; bu plan bunları tamamlanmış göstermez.

## 16 Kasım uygulama notları

- İşaretli adımların davranış/test sonucu [teslim kaydında](../../MONTHLY_READ_PUBLISHING_DELIVERY.md) bulunur; eski emir kipli adımlar uygulama kontrol listesidir. Canlı Netlify/Neon adımı açık bırakıldı.
- Saf ay/seçim/cache fallback iş kuralları `apps/web/src/server/monthly-read/publication.ts` içine ayrıldı; `public.ts` yalnız gerçek DB/Next cache bağlantısını kurar. Bu somut test sınırı yeni servis veya genel repository katmanı değildir. Ortak sunumun stilleri `monthly-read.module.css` içinde; public/admin layout değişmedi.
- Drizzle `0001_snapshot.json` eklendi. Sonraki generate'in tekrar CREATE üretmediği izole klasörde gerçek generator ile doğrulandı. Eksik snapshot ve önizleme/public kapak stil farkı uzman incelemesinde bulundu ve giderildi; dar tekrar incelemesi iki bulguyu ADDRESSED saydı.
- Ana B kabulüne private/public kapak computed-style eşitliği eklendi. Boş güncel ay ve yayımlanmış gelecek ayın gizlenmesi gerçek iki dilli E2E ile tamamlandı. Mevcut raf testleri artık demo kitap yerine ayrı DB'deki yayımlanmış tarihsel fixture'ları kullanır.
- RED kanıtı: yeni public seçim modülü yokken unit testi, numarasız yayın önizlemesi yokken ana E2E başarısız oldu. Sonradan bulunan iki hata da gerçek generator/tarayıcıda önce/sonra doğrulandı. Luna'nın ilk veri katmanı için RED raporu kullanım sınırı nedeniyle gelmedi; bu tarihsel adım doğrulanmış sayılmadı. Ek güvenlik testleri uygulama sonrası genişletildi. Kutular bütün fonksiyonların ilk yazılış sırasına dair iddia değildir.
- Native `uygulayici` GPT-6 Luna/high veri katmanını kısmen yazdı; kullanım sınırı sonrası ana agent devraldı. Native `uzman` GPT-6 Astra/high salt okunur inceleme ve dar tekrar incelemesini tamamladı. Model kullanımı ve skill gerekçeleri teslim kaydında; commit/push/deploy yok.
