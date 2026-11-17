# LOCAL. Kitap Kulübü

LOCAL. tek bir Next.js uygulaması olarak `apps/web` içinde çalışır. Ortak admin girişi, PostgreSQL’de TR/EN Ayın Kitabı taslağı, özel önizleme ve ayrı yayınlama var. Ana sayfa yalnız yayımlanmış snapshot'ı gösterir; sonraki taslak kayıtları ziyaretçinin son yayınını değiştirmez. Admin kurulumu [ilk teslim kılavuzunda](docs/ADMIN_FIRST_DELIVERY.md), yayın kullanımı ve gerçek test sonuçları [yayın tesliminde](docs/MONTHLY_READ_PUBLISHING_DELIVERY.md). Gerçek abonelik/e-posta ve canlı hizmet kabulü sonraki işlerdir.

## Çalıştırma

17 Kasım admin arayüzü: giriş sonrası `/admin` ana menüsü; kayıtlı ay listesi, TR/EN sekmeli alanlar ve gerçek site şeridiyle anlık önizleme uygulanmıştır. Tamamen boş taslak reddedilir, kısmi içerik kaydedilebilir. Kullanım, kalıcı tasarım standardı, ortak bileşenler ve [yerel kabul sonuçları admin kılavuzundadır](docs/ADMIN_GUIDE.md#yerel-kabul--17-kasım-2026). Netlify/Neon ortamında yeni arayüzün kabulü ayrıca açıktır.

Node 24.x ve pnpm 11.25.0 gerekir. Repo kökünde:

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

Uygulama: [Türkçe](http://127.0.0.1:3000/tr) · [English](http://127.0.0.1:3000/en). `/` ilk ziyarette EN açar; dil düğmesiyle yapılan seçim sonraki kök ziyarette hatırlanır. Açık `/tr` veya `/en` adresi önceliklidir.

Production önizlemesi için geliştirme sunucusunu kapatıp `pnpm build`, ardından `pnpm start` çalıştırın. Her iki sunucu da 3000 portunu kullanır. Home verisi için migrate edilmiş `DATABASE_URL` gerekir; DB erişilemiyorsa geçici içerik hatası gösterilir. Yayın olmayan ay açıklanmamış görünür; demo kitaba düşülmez. Admin ayrıca giriş ayarlarını gerektirir. Diğer public sayfalardaki mevcut demo içerikleri/etkileşimler korunur.

## Kontroller

```powershell
pnpm typecheck
pnpm lint
pnpm build
pnpm --filter @local/web exec playwright install chromium
pnpm test:e2e
```

Playwright yerel sunucuyu kendisi başlatır. Mevcut Google Chrome kullanılacaksa test öncesi `$env:PLAYWRIGHT_CHANNEL='chrome'` ayarlanabilir. Production akışlarını test etmek için önce build alın; başka 3000 sunucusu açık değilken `$env:PLAYWRIGHT_PRODUCTION='1'` ile aynı test komutunu çalıştırın, sonra `Remove-Item Env:PLAYWRIGHT_PRODUCTION` ile bu tercihi kaldırın.

16 Kasım yerel yayın teslimi: unit **7/7**, PostgreSQL entegrasyon **6/6**, ayrı kabul DB'sinde development ve production Playwright **15/15** geçti; lint, typecheck ve build başarılı. Ana kabul B'nin gerçek kaydı/reload kalıcılığını ve anonim TR/EN'de yayınlanana kadar A'nın korunmasını kapsar. Test DB/account ayarları olmadan bazı testler atlanır; bu kabul sayılmaz. [Sonuç ve tekrar çalıştırma](docs/MONTHLY_READ_PUBLISHING_DELIVERY.md), [Docker PostgreSQL kılavuzu](docs/LOCAL_POSTGRES_TESTS.md).

Neon’un Frankfurt projesinde yerel uygulama `staging` dalına bağlı. Havuzlu ve doğrudan bağlantı, iki migration ve deneme admini kaydı doğrulandı. Kullanıcı Netlify deneme sitesinde admin girişini doğruladı. Netlify üzerinden taslak/yayın ve platform IP başlığı kontrolleri bekliyor. [Netlify deneme kurulumu](docs/ADMIN_FIRST_DELIVERY.md#16-kasım--netlify-deneme-kurulumu).

## Mevcut kapsam

Ana sayfa, About/Goodies, görünür metinsiz galeri ve albümler, Contact; gerçek TR/EN adresleri, kitap şeridi, klavye destekli fotoğraf büyütme ve gerçek footer bağlantıları var. Home yayımlanmış kitap/şerit içeriğini DB'den okur; kapak yer tutucudur, başlık numarasızdır. Diğer içerikler temsili; formlar kayıt yapmaz veya e-posta göndermez ve bunu işlemden önce belirtir. Hazırlık sürümü `noindex,nofollow` kullanır.

Yalnızca LOCAL. logosu Futura PT Condensed Medium / **#89667C**; diğer metinler Courier New Regular, bülten başlığı Bold. Adobe kitindeki gerçek Medium 500 yüzü kontrol/ekleme işi sürer; ZIP kullanılmaz. Bülten dışı şeritler **#BF7CAB**, bülten **#A31B3D**, metinler siyah. Masaüstü görünüm korundu; mobil fallback son mobil tasarım değildir, animasyon seçimi açık.

Kitap kapakları tıklanmaz; puanlama, arşiv, takvim ve kitap detay sayfaları yok. `#38`, 38. okunan kitabın temsili numarasıdır; otomatik artış yöntemi henüz seçilmedi. Bilinmeyen/kaldırılmış adresler HTTP 404 döndürür.

## Yapı ve seçilen araçlar

- `apps/web`: Next.js App Router + TypeScript, server-rendered sayfalar ve gerekli client etkileşimleri. Tek uygulama, pnpm workspace; ayrı backend/deploy veya Turborepo yok.
- Yerel `design-preview` arşivi eski statik tasarım referansı ve tasarım masasıdır; bu özellik commit'inin parçası değildir.
- `docs`: ürün kararları, soru/cevaplar, plan ve uygulama kayıtları.

**Seçili altyapı** Netlify + Neon + Cloudflare R2 + Resend, Drizzle + Better Auth ve hata takibi için Sentry. Ücretsiz başlangıç hedefi var. İki kişinin kullanacağı tek ortak tam yetkili site admin hesabı kurulacak. Teknik uyarılar geliştiriciye gidecek. Contact site içinde arşivlenmez, yalnızca PO'ya iletilecek. Gmail otomatik silinmeyecek.

## Karar ve hazırlık kayıtları

- [Paylaşılabilir kararlar, kabul durumu ve sonraki işler](docs/MONTHLY_READ_DECISIONS.md)
- [İlk admin teslimi planı](docs/superpowers/plans/2026-11-15-ayin-kitabi-ilk-teslim.md)
- [Yayınlama planı ve uygulama sonucu](docs/superpowers/plans/2026-11-15-ayin-kitabi-yayinlama.md)
- [Yayın teslimi ve test kanıtı](docs/MONTHLY_READ_PUBLISHING_DELIVERY.md)

Domain gövdesi `localkitapkulubu`; uzantı/firma ve bülten posta kutusu henüz seçilmedi. PO gerçek TR/EN içerik ve görselleri hazırlayacak. Kitap kapağı kullanım yolu, mobil/animasyon/e-posta son görünümü ve yayın tarihi ayrı açık/ertelenen işlerdir. Admin ana menüsü ve editörünün onaylı standardı [admin kılavuzundadır](docs/ADMIN_GUIDE.md). Abone açılma/tıklama takibi kapalı; temel SEO + Search Console seçili, ayrı ziyaretçi analytics script'i yok.

Ham kaynak/oturum notları, kişisel işletim adresleri ve PO paylaşım PDF'si yerelde korunur; bu commit kapsamında paylaşılmaz. Gerçek `.env` değerleri ve hiçbir parola veya secret belgeye yazılmaz. Yalnız yer tutuculu `.env.example` paylaşılır.
