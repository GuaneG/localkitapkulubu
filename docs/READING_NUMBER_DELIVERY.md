# Ayın Kitabı okuma numarası — 17 Kasım 2026

## 19 Kasım — Neon deneme veritabanı migration kabulü

Yerel `.env.local` bağlantısının adresi, önceki deneme kurulumu kaydındaki Neon `staging` endpoint’iyle eşleştirildi. Doğrudan bağlantıyla ilk iki migration’ın mevcut olduğu ve `reading_number` kolonlarının henüz bulunmadığı okundu. `pnpm db:migrate` komutunun kullandığı `scripts/migrate.ts`, `DATABASE_URL` yalnız bu işlemde doğrulanmış doğrudan bağlantıya ayarlanarak çalıştırıldı. Sonuç başarılı. İki tabloda nullable integer kolonları, iki pozitif sayı kısıtı ve Drizzle journal’daki 0002 zamanına ait üçüncü migration kaydı salt okunur sorgularla doğrulandı. Uygulama kayıtlarına okuma numarası atanmadı. Güncel birim testleri yeniden çalıştırıldı ve 9/9 geçti.

Bu kabul Neon şeması içindir. Netlify’da yeni kodun deploy’u ve tarayıcıdaki 38→39 kabulü ayrıca bekliyor. Aşağıdaki 17 Kasım yerel teslim sonuçları ve o turdaki yetki sınırları tarihsel kayıttır. Bu tur `finishing-a-development-branch`, `verification-before-completion` ve değişen veri akışının salt okunur kontrolünde `security-audit` rehberliği kullanıldı.

**Kullanıcı kararı:** editörde TR/EN sekmelerinin dışında tek bir “Okuma numarası” alanı. PO yalnız 38 yazar; site ve özel önizleme iki dilde `Read of the month #38` gösterir. Alan isteğe bağlı pozitif tam sayı; eski kayıtlarda numara yoktur. İlk gerçek kayda 38’i PO girer. Otomatik artış, numara üretimi ve gerçek veriye backfill kapsam dışıdır.

## Uygulama tercihi

Mevcut AdminField ve MonthlyReadBand yeniden kullanılır. Nullable PostgreSQL `integer` aralığı 1..2147483647 form, sunucu ve DB’de korunur. Sayı, taslak ile değişmez yayın revision’ında saklanır; B taslağındaki değişiklik mevcut A yayınına yazılmaz. Sayı boşken başlık `Read of the month` kalır. Numara iki dil için ortaktır, benzersizlik veya otomatik sıralama kuralı eklenmez.

API eski istemciyle uyumluluk için alanın gönderilmemesini mevcut numarayı koruma olarak yorumlar; yeni kayıtta NULL. Açık `null` numarayı temizler. Geçerli yalnız numara da kısmi taslaktır; tamamen boş kayıt reddi ve yayındaki beş zorunlu TR/EN metin kuralı sürer. Yetki, origin ve expectedVersion kontrolleri, satır kilidi ve aynı receipt kimliğinden snapshot okuması değişmez.

## Yerel doğrulama

Yalnız loopback Compose entegrasyon DB’si ile ondan ayrı admin kabul DB’si ve disposable test admini kullanıldı. Gerçek `.env.local`, Neon ve normal geliştirme verileri migration/test hedefi değildir. Migration 0002 yerel kabul DB’sine mevcut migrate komutuyla; entegrasyon DB’sine test hazırlığında uygulandı.

| Gerçekten çalıştırılan kontrol | Sonuç |
| --- | --- |
| `pnpm lint` | Başarılı, uyarı yok. |
| `pnpm typecheck` | Başarılı. Son testlerin ürettiği geçici Next include yolları kaldırıldıktan sonra tekrar doğrulandı; tsconfig değişikliği yok. |
| `pnpm test:unit` | 9/9 geçti, atlanan yok; yeni sayı doğrulaması ve yayın DTO/cache regresyonları dahil. |
| `.\scripts\test-postgres.ps1` | 7/7 geçti, atlanan yok; nullable/pozitif kısıtlar, omit/null, numara-only taslak, sürüm/transaction ve değişmez snapshot dahil. |
| Ayrı yerel DB ayarlarıyla `pnpm build` | Next 16.4.6 üretim build’i başarılı. |
| Ayrı kabul DB’siyle `pnpm test:e2e` | Son kodla development 16/16 geçti (34,7 saniye), atlanan yok. |
| Aynı DB, üretim build’i ve `PLAYWRIGHT_PRODUCTION=1 pnpm test:e2e` | Son kodla 16/16 geçti (20,0 saniye), atlanan yok. |
| `pnpm --filter @local/web exec drizzle-kit generate --name reading_number_metadata_check` | Şema değişikliği yok; SQL/journal/snapshot tutarlı, ek migration üretilmedi. |
| `git diff --check` ve paylaşılabilir belge bağlantı kontrolü | Temiz; README/kılavuz/karar/teslim/plan içindeki 52 yerel bağlantı mevcut izlenen veya bu teslimin yeni dosyalarına çözülür. Index başlangıçla aynı, stage boş. |

Playwright gerçek Chromium tarayıcısında formu, kaydetme isteklerini, reload kalıcılığını, özel önizlemeyi ve ayrı cookiesiz TR/EN HTML/RSC yanıtlarını doğruladı. Aynı tam koşu iki farklı ayın kaydı/listeden açılması, boş/kısmi/legacy kayıtlar, yetkisiz erişim ve mevcut public regresyonlarını da kapsar. Özel önizlemenin #39 ekran görüntüsü gözle incelendi; CSS ve kapak görünümü değiştirilmedi. Test çıktıları/ekran görüntüleri commit kapsamı değildir.

Ana kabul mevcut [yayın testinde](../apps/web/e2e/publication.spec.ts): 38 yayınla → 39 taslak kaydet → editörü reload et → ortak alanda ve özel TR/EN önizlemede 39 → anonim TR/EN ana sayfalarda 38 → 39 yayınla → anonim iki dilde 39. Negatif, sıfır, kesir, fazla büyük ve sayı olmayan değerlerin reddi; legacy numarasız kayıtlar, null/omit ve sürüm çakışması da doğrulanır.

### Güvenlik incelemesi ve iş bölümü

Native `uygulayici` **GPT-6 Luna**, doğrulama/DTO, Drizzle schema/migration ve repository/public dönüşümü ile unit/entegrasyon testlerini uyguladı. Ana agent editör, ortak bileşenler, Playwright ve teslim belgelerini tamamladı. Native `uzman` GPT-6 Astra çağrısı kota nedeniyle inceleme üretemedi. AGENTS’in alternatif model izniyle uzman yönergeleri elle aktarılan **GPT-6.2 Astra**, değişen akışı bağımsız ve salt okunur `security-audit` rehberlik modunda inceledi; bu iki modelin sonucu birbirine atfedilmez.

İncelemede yetki atlama, taslağın public/cache’e sızması veya tekrar yayın korumasında yeni açık bulunmadı: [sunucu admin kontrolü](../apps/web/src/server/monthly-read/service.ts), [kilitli sürümden kayıt/yayın](../apps/web/src/server/monthly-read/repository.ts), [yalnız seçilmiş yayın DTO’su](../apps/web/src/server/monthly-read/publication.ts), [revision kimliğiyle cache](../apps/web/src/server/monthly-read/public.ts). Yeni servis/paket veya yetki türü yoktur. Mevcut esbuild/picomatch bağımlılık bulguları [ayrı raporda](DEPENDENCY_SECURITY_2026-11-17.md) açık kalır; bu teslim sıfır güvenlik bulgusu veya tam site denetimi iddiası değildir.

**Düzeltilen uyumluluk bulgusu:** eski istemci numarayı göndermeden son metni temizlediğinde korunacak sayı okunmadan 422 veriliyordu. Erken boşluk kontrolü yeni kayıt/açık sayı için korundu; omitted güncellemenin birleşmiş son durumu kilitli satırda, sürüm denetiminden sonra ve yazmadan önce doğrulanır. Mevcut 38 korunarak yalnız-numara taslağı kaydedilir; mevcut NULL ise 422 ve değişmeyen sürüm beklenir. Unit testinde önce beklenen 422 RED görüldü, düzeltmeden sonra 9/9 GREEN; PostgreSQL regresyonu da geçti. Bağımsız yeniden inceleme bulguyu kapattı.

TDD kanıt sınırı: UI alanı eklenmeden önce Playwright tek “Okuma numarası” alanını bulamayarak RED verdi, ekleme sonrası geçti. Luna’nın ilk backend test denemesi sandbox `spawn EPERM` nedeniyle sonuç üretmedi; backend için uygulama öncesi doğrulanmış RED iddiası yoktur. Ana agent sonradan eski HEAD contracts ile izole regresyonu yeniden oynatıp eksik `parseReadingNumber` hatasını gördü; bu kontrol uygulama sonrası replay’dir.

Kullanılan skill’ler: **brainstorming / writing-plans** (kullanıcının net kapsamını teknik plana kaydetme), **test-driven-development** (anlamlı sayı ve UI regresyonları), **systematic-debugging** (incelemede bulunan boşluk doğrulamasının kök nedeni), **security-audit** (değişen güven sınırlarının odaklı kaynak incelemesi), **vercel:react-best-practices** (ortak alan/erişilebilirlik ve React kontrolü), **verification-before-completion** (gerçek komut sonuçlarıyla teslim). Yeni paket veya genel editör katmanı eklenmedi.

## Netlify deploy öncesi migration

Yeni nullable alanlar için [0002_reading_number.sql](../apps/web/drizzle/0002_reading_number.sql), [journal](../apps/web/drizzle/meta/_journal.json) ve [Drizzle snapshot](../apps/web/drizzle/meta/0002_snapshot.json) birlikte teslim edilir. Mevcut `pnpm db:migrate` akışı gereklidir. Migration önce yetkili deneme DB’sine, ardından yeni uygulama kodunun deploy’undan **önce** hedef DB’ye uygulanmalıdır; önceki uygulama nullable alanları kullanmadan çalışabilir. Yeni kod migration olmadan devreye alınmamalıdır. Runtime migration çalıştırmaz. Bu tur **Neon migration veya Netlify deploy yapılmadı**; yalnız ayrı yerel test DB’lerine uygulandı.

Hedefte migration başarı kaydı ve iki tablonun nullable/pozitif sayı kısıtları doğrulandıktan sonra yeni kod deploy edilir. İlk gerçek taslağa PO 38 girer. Yetkili Netlify/Neon ortamında numarasız eski kayıt, 38/39 taslak-yayın ayrımı, gerçek oturum/origin/IP sınırı ve iki dilde HTML/RSC/CDN sonucu ayrıca kabul edilir.

Elle sayı girişi için açık PO kararı yoktur. Otomatik artış, numara benzersizliği, kapak yükleme, kitap kimliği seçimi ve tam ay değişimi ayrı kapsamdır. Stage, commit, push veya deploy yapılmadı; mevcut admin/bağımlılık değişiklikleri korundu. [PO kılavuzu ve ortak bileşenler](ADMIN_GUIDE.md), [güncel paylaşılabilir kararlar](MONTHLY_READ_DECISIONS.md), [uygulama planı](superpowers/plans/2026-11-17-reading-number.md).
