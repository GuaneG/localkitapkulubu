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

### 16 Kasım — Neon bağlantı kontrolü

Kullanıcının Frankfurt’ta açtığı Neon projesinin varsayılan `production` dalına ait havuzlu `DATABASE_URL` ve doğrudan `DATABASE_URL_UNPOOLED` değerleri, Neon CLI’nin `env pull` komutuyla Git’in yok saydığı `apps/web/.env.local` dosyasına alındı. İki adresin aynı veritabanına ait olduğu ve ikisinde de uygulamanın `pg` sürücüsüyle `SELECT 1` çalıştığı doğrulandı.

Bağlantı için yalnız gerekli iki ayarı alan Neon CLI `env pull` komutu seçildi. Uygulamanın bağlantı değişkeni `DATABASE_URL`. [Neon CLI ortam değişkenleri](https://neon.com/blog/branch-first-dev-loop).

Kullanıcı, Netlify denemesi için `production` altında `staging` dalını açtı. Otomatik silme kapalı. Yerel `apps/web/.env.local` artık `staging` dalına bağlı. İki bağlantıda `SELECT 1` geçti. Kurulumda Drizzle migration'ları ve deneme admini için doğrudan bağlantı, uygulama için havuzlu bağlantı kullanıldı. İki migration kaydı, taslak/yayın tabloları ve tek deneme admininin Better Auth parola kaydı doğrulandı. Deneme admininin giriş bilgileri yalnız yerel dosyada. Netlify üzerinden tarayıcı girişi ve yayın akışı bekliyor. Entegrasyon testlerinin tablo sıfırlama işlemleri için ayrı, harcanabilir veritabanı kullanılır. [Güncel sonraki adımlar](NEXT_STEPS.md#uygulanacak-işler--güncel-kapsam-ve-kalan-ayrıntılar).

### 16 Kasım — Netlify deneme kurulumu

Kullanıcı `GuaneG/localkitapkulubu` reposunun `main` dalını Netlify’a bağladı ve ortam değişkeni importundan sonraki deploy’un tamamlandığını bildirdi. Deneme sitesi Netlify takım girişiyle korunuyor. Netlify oturumu açıldıktan sonra tarayıcıda `/en` ve `/tr` ana sayfaları, iki dilde açıklanmamış ay durumu ve `/admin/giris` formu görüldü. Deneme adminiyle oturum açma ve taslak/yayın akışı açık.

Monorepo ayarları repo kökünde kurulum, `apps/web` paket dizini ve `apps/web/.next` yayın çıktısıdır. Deneme sitesinin ana deploy bağlamında `NODE_VERSION`, `DATABASE_URL`, `BETTER_AUTH_URL` ve `BETTER_AUTH_SECRET` girildi. Neon hedefi `staging`. `BETTER_AUTH_URL` Netlify adresinin origin’i ve `BETTER_AUTH_SECRET` Netlify ortamına özel. Deneme admininin parolası yalnızca yerel bootstrap/giriş için tutulur. Netlify’ın bu değişkenlerle giriş, taslak ve yayın işlemlerini çalıştırdığı henüz doğrulanmadı.

İlk LOCAL. girişinde tarayıcı genel hizmet hatası gösterdi. Netlify oturumuyla yapılan salt okunur `GET /api/auth/get-session` çağrısında loopback hatası görüldü. Giriş rotası `NETLIFY` build değişkenini kontrol edince Function çalışma ortamında yerel modu seçiyordu. Yerel düzeltme, Netlify’ın Functions için sağladığı `SITE_ID` ile HTTPS kurulumunu tanıyor. Panelde ek bir ortam değişkeni gerekmiyor. Mevcut istemci IP kontrolü korunuyor. [Netlify Functions ortam değişkenleri](https://docs.netlify.com/build/functions/environment-variables/#netlify-read-only-variables).

Düzeltmeden önce regresyon testi aynı hatayla kırıldı. Düzeltme sonrası 8/8 birim testi, değişen dosyaların lint kontrolü ve Next.js production build’in TypeScript kontrolü geçti. Yerelde derlenmiş rotada yapay Netlify ortamı ve geçerli platform başlığı ile oturumsuz yanıt `200`, başlık veya platform bilgisi yokken `503` doğrulandı. Netlify’da yeni deploy, gerçek IP başlığının davranışı ve deneme adminiyle giriş bekliyor.

### Yerel test komutları

- `pnpm test:unit`: dönem/girdi doğrulama ve yerel IP güveni.
- `pnpm test:integration`: yalnız ayrı `TEST_DATABASE_URL` ve `ALLOW_TEST_DATABASE_RESET=1` verilirse gerçek PostgreSQL tablolarını sıfırlayarak çalışır. Uygulama `DATABASE_URL` ile aynı bağlantı reddedilir. Değişken yoksa testler açıkça atlanır; bu entegrasyon kabulü değildir.
- `pnpm typecheck`, `pnpm lint`, `pnpm build`.
- `pnpm test:e2e`: mevcut public testler ve anonim admin erişimi. Kurulu Chrome için `PLAYWRIGHT_CHANNEL=chrome` kullanılabilir.
- Gerçek admin E2E için ayrı, migrate edilmiş ve test admini oluşturulmuş kabul DB'sini sunucuya `DATABASE_URL`, test sürecine `TEST_DATABASE_URL` olarak verin. Test hesabı `ADMIN_EMAIL`/`ADMIN_PASSWORD` ile belirtilir. Bu E2E seçili test oturumlarını ve 2028-11 ayını değiştirir; gerçek işletim veritabanında çalıştırmayın.
- Geliştirme/production sunucuları için ayrı `NEXT_DIST_DIR` (ör. `.next-admin-dev`, `.next-admin-production`) ve `PLAYWRIGHT_PORT` kullanılabilir. Production testinde aynı çıktı diziniyle önce build alın, sonra `PLAYWRIGHT_PRODUCTION=1` ile testleri çalıştırın. Testlerin `BETTER_AUTH_URL` değeri seçilen portla eşleşmelidir.

## Login koruması ve ortam sınırı

Gerçek `POST /api/auth/sign-in/email` isteğinde IP/normalize hesap başına kayan 900 saniyede beş başarısız parola sınırı uygulanır. PostgreSQL advisory transaction kilitleri iki anahtarı sabit sırada kilitler; auth ve limiter bağlantı havuzları ayrıdır. Yanıt sayaç transaction'ı commit edilmeden gönderilmez. 429 süresi yeni engellenmiş istekle uzamaz. Başarılı girişler sayacı sıfırlamaz; bozuk istek/altyapı hataları yanlış parola sayılmaz. Public kayıt ve kapsam dışı Better Auth HTTP yolları kapalıdır. Turnstile/honeypot admin girişinde yoktur.

Yerel sunucuda loopback bağlamı kullanılır ve yönlendirme başlıkları güvenilmez. Netlify Functions ortamında `SITE_ID` bulunan HTTPS kurulumunda `x-nf-client-connection-ip` zorunludur. Eksik ve geçersiz IP istekleri `503` alır. Netlify'ın başlığı gerçek istemci IP’siyle üzerine yazması ve origin erişiminin sınırı gerçek deploy’da ayrıca doğrulanmalıdır.

Kaynak: [Netlify'nin bağlantı IP başlığı açıklaması](https://answers.netlify.com/t/upcoming-change-stripping-exposed-netlify-headers-from-function-and-proxy-requests/52665). Parola, oturum token'ı, cookie ve bağlantı sırları loglanmaz. Sadece tek ortak adminin kullanıcı kimliği yetkilidir; oturum sabit yedi gün sonra sona erer.

## 15 Kasım 2026 doğrulama kaydı

- Kurulu PostgreSQL 18 ile yalnız loopback üzerinde açılan geçici kümede ayrı entegrasyon ve tarayıcı kabul veritabanları kullanıldı. Gerçek Neon bağlantısı veya gerçek PO hesabı kurulmadı.
- Birim testleri: **2/2**. Gerçek PostgreSQL entegrasyon senaryoları: **3/3**, atlanan yok. Bunlar gerçek Better Auth HTTP girişini, iki ayrı uygulama sürecini, küçük/ayrı bağlantı havuzlarında eşzamanlı başarılı/başarısız girişleri, 899/901 saniye pencereyi, limiter commit hatasında cookie/token vermemeyi, bootstrap tekrarını, yedi günlük oturumu, create/version yarışlarını ve rollback'i kapsar.
- Chrome E2E: development **12/12**, production **12/12**, atlanan yok. Üç admin senaryosu, mevcut dokuz ziyaretçi senaryosuyla birlikte geçti. Dev sunucudan production sunucuya yeniden açılışta kayıtlı metnin korunduğu da doğrulandı.
- DB/auth ortam değişkenleri olmadan production ziyaretçi kontrolleri ayrıca **9/9** geçti. Production build de DB/auth ayarları olmadan alındı. TypeScript ve ESLint geçti.
- İlk denemelerde sandbox alt süreç engeli ve Playwright'ın indirilen tarayıcısının yokluğu görüldü; izinli çalıştırma ve kurulu Chrome ile çözüldü. Next'in iç URL'yi localhost'a dönüştürmesi gerçek tarayıcı testinde saptandı ve loopback/Host/port kontrolü regresyon testiyle düzeltildi. Kaynak dışı `.next-*` test çıktıları lint kapsamından çıkarıldı.
- GPT-6 Astra salt okunur son incelemesinde kritik/önemli uygulama bulgusu bildirmedi. Bildirilen doğrulama boşlukları ek testlerle kapatıldı: auth sonrası commit hatası, sahte cookie için GET/PUT/önizleme ve bağımsız çalışabilen iki süreç testi.
- Netlify ortamında başlık üzerine yazımı ve gerçek Neon/TLS bağlantısı bu yerel sonuçlarla doğrulanmış sayılmaz. Yayın/deploy yapılmadı; bunlar gerçek ortam kurulumu kontrolleridir.
