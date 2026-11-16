# Ayın Kitabı — ilk admin teslimi

Bu belge 15 Kasım ilk admin tesliminin tarihsel kapsamı ve kurulum kılavuzudur. **16 Kasım'da yayınlama eklendi; güncel Home davranışı ve kabul sonuçları [yayın teslimindedir](MONTHLY_READ_PUBLISHING_DELIVERY.md).** Aşağıdaki “public demo / yayın sonraki iş” ifadeleri ilk teslim anını anlatır.

Public TR/EN sayfaları demo verisini okumaya devam eder. Bu teslim yalnız ortak admin girişi, ay başına bir taslak, TR/EN kitap/şerit metni ve özel önizlemedir. Yayın, ay geçişi/cache, kitap seçicisi/tekrar atama kuralı, kapak yükleme, okuma numarası ve ziyaretçi formu spam koruması sonraki teslimdedir.

## Yerel kullanım

1. `pnpm install --frozen-lockfile`.
2. `apps/web/.env.example` dosyasından Git dışında tutulan `.env.local` hazırlayın. `DATABASE_URL` geliştirme Neon PostgreSQL bağlantısı; `BETTER_AUTH_URL` yerel origin (sonunda slash yok); `BETTER_AUTH_SECRET` en az 32 karakter rastgele sır olmalı. Ortak hesabın adresini işletim kararına göre `ADMIN_EMAIL` olarak girin; gerçek parolayı yalnız yerel/gizli ortam ayarlarında tutun.
3. Repo kökünde `pnpm db:migrate`, ardından `pnpm admin:provision`. Web runtime migration veya hesap açma işlemi yapmaz. Bootstrap tekrar çalıştırıldığında mevcut hesap/parola korunur. İşlemden sonra `ADMIN_PASSWORD` runtime ortamından kaldırılabilir.
4. `pnpm dev` → `/admin/giris`. Sunucu yalnız 127.0.0.1 üzerinde dinler. Yönetim alanı kendi Türkçe kök layout ve stillerini kullanır.

Taslak ayı zorunludur; eksik çeviriler kaydedilebilir. Önizleme son kaydedilmiş sürümü gösterir. Aynı sürümü açan iki oturumdan ilki kaydeder; ikincisi 409 alır, form korunur ve son kayıt ayrı gösterilir. Son kaydı yüklemek için açık onay gerekir. Ağ/DB/oturum hatası metni silmez; yeniden giriş ayrı sekmede yapılabilir. Metin localStorage'a veya URL'ye kaydedilmez; sekmeyi kapatmak kaydedilmemiş metni kaybettirir.

## Kontroller

- `pnpm test:unit`: dönem/girdi doğrulama ve yerel IP güveni.
- `pnpm test:integration`: yalnız ayrı `TEST_DATABASE_URL` ve `ALLOW_TEST_DATABASE_RESET=1` verilirse gerçek PostgreSQL tablolarını sıfırlayarak çalışır. Uygulama `DATABASE_URL` ile aynı bağlantı reddedilir. Değişken yoksa testler açıkça atlanır; bu entegrasyon kabulü değildir.
- `pnpm typecheck`, `pnpm lint`, `pnpm build`.
- `pnpm test:e2e`: mevcut public testler ve anonim admin erişimi. Kurulu Chrome için `PLAYWRIGHT_CHANNEL=chrome` kullanılabilir.
- Gerçek admin E2E için ayrı, migrate edilmiş ve test admini oluşturulmuş kabul DB'sini sunucuya `DATABASE_URL`, test sürecine `TEST_DATABASE_URL` olarak verin. Test hesabı `ADMIN_EMAIL`/`ADMIN_PASSWORD` ile belirtilir. Bu E2E seçili test oturumlarını ve 2028-11 ayını değiştirir; gerçek işletim veritabanında çalıştırmayın.
- Geliştirme/production sunucuları için ayrı `NEXT_DIST_DIR` (ör. `.next-admin-dev`, `.next-admin-production`) ve `PLAYWRIGHT_PORT` kullanılabilir. Production testinde aynı çıktı diziniyle önce build alın, sonra `PLAYWRIGHT_PRODUCTION=1` ile testleri çalıştırın. Testlerin `BETTER_AUTH_URL` değeri seçilen portla eşleşmelidir.

## Login koruması ve ortam sınırı

Gerçek `POST /api/auth/sign-in/email` isteğinde IP/normalize hesap başına kayan 900 saniyede beş başarısız parola sınırı uygulanır. PostgreSQL advisory transaction kilitleri iki anahtarı sabit sırada kilitler; auth ve limiter bağlantı havuzları ayrıdır. Yanıt sayaç transaction'ı commit edilmeden gönderilmez. 429 süresi yeni engellenmiş istekle uzamaz. Başarılı girişler sayacı sıfırlamaz; bozuk istek/altyapı hataları yanlış parola sayılmaz. Public kayıt ve kapsam dışı Better Auth HTTP yolları kapalıdır. Turnstile/honeypot admin girişinde yoktur.

Yerelde yönlendirme/IP başlıkları güvenilmez; loopback bağlamı kullanılır. `NETLIFY=true` ortamında platformun `x-nf-client-connection-ip` başlığı kullanılır; eksik/geçersiz değer girişi kapatır. Netlify'nin bu başlığı gerçek istemci IP'siyle üzerine yazması ve doğrudan origin erişimi olmadığı canlı ortamda ayrıca doğrulanmalıdır. Yerel testler bu platform doğrulamasının yerine geçmez; bu teslim deploy yapmaz.

Kaynak: [Netlify'nin bağlantı IP başlığı açıklaması](https://answers.netlify.com/t/upcoming-change-stripping-exposed-netlify-headers-from-function-and-proxy-requests/52665). Parola, oturum token'ı, cookie ve bağlantı sırları loglanmaz. Sadece tek ortak adminin kullanıcı kimliği yetkilidir; oturum sabit yedi gün sonra sona erer.

## 15 Kasım 2026 doğrulama kaydı

- Kurulu PostgreSQL 18 ile yalnız loopback üzerinde açılan geçici kümede ayrı entegrasyon ve tarayıcı kabul veritabanları kullanıldı. Gerçek Neon bağlantısı veya gerçek PO hesabı kurulmadı.
- Birim testleri: **2/2**. Gerçek PostgreSQL entegrasyon senaryoları: **3/3**, atlanan yok. Bunlar gerçek Better Auth HTTP girişini, iki ayrı uygulama sürecini, küçük/ayrı bağlantı havuzlarında eşzamanlı başarılı/başarısız girişleri, 899/901 saniye pencereyi, limiter commit hatasında cookie/token vermemeyi, bootstrap tekrarını, yedi günlük oturumu, create/version yarışlarını ve rollback'i kapsar.
- Chrome E2E: development **12/12**, production **12/12**, atlanan yok. Üç admin senaryosu, mevcut dokuz ziyaretçi senaryosuyla birlikte geçti. Dev sunucudan production sunucuya yeniden açılışta kayıtlı metnin korunduğu da doğrulandı.
- DB/auth ortam değişkenleri olmadan production ziyaretçi kontrolleri ayrıca **9/9** geçti. Production build de DB/auth ayarları olmadan alındı. TypeScript ve ESLint geçti.
- İlk denemelerde sandbox alt süreç engeli ve Playwright'ın indirilen tarayıcısının yokluğu görüldü; izinli çalıştırma ve kurulu Chrome ile çözüldü. Next'in iç URL'yi localhost'a dönüştürmesi gerçek tarayıcı testinde saptandı ve loopback/Host/port kontrolü regresyon testiyle düzeltildi. Kaynak dışı `.next-*` test çıktıları lint kapsamından çıkarıldı.
- GPT-6 Astra salt okunur son incelemesinde kritik/önemli uygulama bulgusu bildirmedi. Bildirilen doğrulama boşlukları ek testlerle kapatıldı: auth sonrası commit hatası, sahte cookie için GET/PUT/önizleme ve bağımsız çalışabilen iki süreç testi.
- Netlify ortamında başlık üzerine yazımı ve gerçek Neon/TLS bağlantısı bu yerel sonuçlarla doğrulanmış sayılmaz. Yayın/deploy yapılmadı; bunlar gerçek ortam kurulumu kontrolleridir.
