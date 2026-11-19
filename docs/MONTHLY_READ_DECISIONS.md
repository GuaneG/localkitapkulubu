# Ayın Kitabı — paylaşılabilir karar ve kabul özeti

17 Kasım 2026. Bu belge admin, taslak ve yayınlama tesliminin depoda paylaşılabilir dayanağıdır. Kişisel iletişim adresleri, hesap sırları ve ham oturum notları bu özete dahil değildir. İlk yayın kabulünün tarihsel sonuçları aşağıdadır; güncel okuma numarası ek teslimi [ayrı kayıttadır](READING_NUMBER_DELIVERY.md).

## İçerik ve yayın kuralları

- Tek ortak, tam yetkili admin hesabı; public kayıt, ziyaretçi hesabı ve parola kurtarma bu kapsamda yok. Gerçek hesap adresi/parolası yalnız özel ortam ayarlarında tutulur.
- Ay başına tek taslak; eksik TR/EN çeviriler taslak olarak kaydedilebilir. Yayın için iki dilde kitap adı ve şerit metni, ortak yazar ve dahili okuma ayı zorunludur. Başlıkların iki dilde aynı olması mümkündür.
- Kaydetmek yayınlamak değildir. Kaydedilmiş taslak yalnız yetkili önizlemede görünür; yayın sonrasında taslağı düzenlemek ziyaretçinin son yayınını değiştirmez.
- Kapak yer tutucusu korunur. 17 Kasım kullanıcı kararıyla ilk yayındaki sürekli numarasız başlık kararı değişti: isteğe bağlı ortak numara PO tarafından elle girilir; NULL eski kayıt numarasız görünür. Taslak ve yayın ayrı numara saklar. Gerçek kapak yükleme, numara otomasyonu ve kimlikle kitap seçimi/aynı kitabı başka aya atamama kontrolü sonraki işlerdir.
- Güncel ay `Europe/Istanbul` ile seçilir. O ayın yayını yoksa açıklanmamış, bağlantısız görünüm kullanılır; önceki kitap güncel yerine gösterilmez ve gelecek ayın yayını erken görünmez. Tam gece yarısı/yıl geçişi kabulü ayrı iştir.

## Mimari ve ödünleşimler

15 Kasım planında seçilen, 16 Kasım'da uygulanan yaklaşım: iki dili içeren değişmez yayın snapshot'ı ve aylık güncel referans aynı PostgreSQL transaction'ında yazılır. Mutable taslağa yalnız bir yayın işareti ekleme alternatifi, sonraki kaydın yayını değiştirebilmesi nedeniyle seçilmedi.

Save ve publish aynı taslak satırını kilitler; önce `expectedVersion` karşılaştırılır. Aynı kaynak sürüm için tek snapshot vardır. Güvenli tekrar aynı revision kimliğini döndürür; eski sürüm isteği yeni yayını geri alamaz.

Her yeni Home sunucu isteği güncel/geçmiş yayın referanslarını primary DB'den taze okur. Yalnız değişmez payload revision kimliğiyle cache'lenir. Böylece doğruluk invalidation zamanlamasına bağlı değildir; `pendingRevisionId`, özel cache retry/probe veya worker yoktur. Ödünleşim, her Home isteğinde küçük DB sorgusu ve DB erişilebilirliğine bağımlılıktır.

Commit başarılıyken HTTP yanıtı kaybolursa admin mevcut yetkili durum okumasıyla sonucu öğrenir veya aynı sürümü güvenle tekrar gönderir. DB arızası açıklanmamış ay sayılmaz. Garanti commit sonrasında başlayan yeni sunucu istekleri içindir; açık sekme ve eski prefetch kendiliğinden yenilenmez.

## Giriş ve çalışma kuralları

Gerçek giriş isteğinde IP ve normalize hesap başına kayan 15 dakikada beş başarısız deneme sınırı uygulanır. Honeypot/Turnstile ziyaretçi formlarının sonraki teslimindedir; admin girişine eklenmez. Sunucu okuma/yazma ve önizleme işlemlerinde admin yetkisi doğrulanır; admin yanıtları private/no-store ve noindex kalır.

Tek `apps/web`, pnpm, Better Auth ve Drizzle/PostgreSQL yapısı korunur. Ortak doğrulama ve önizleme/public sunumu yeniden kullanılır; ayrı Türkçe admin kökü ve public TR/EN layout korunur. Testler yalnız ayrılmış veritabanlarında çalıştırılır.

## Yerel kabul

- [x] A yayımlandı; B gerçek istekle taslak kaydedildi; editör reload sonrası beş B alanı ve sürümü korundu. Özel TR/EN önizleme B, ayrı cookiesiz HTML/RSC istekleri B yayımlanana kadar A, sonrasında B gösterdi.
- [x] Eksik iki dil, yetkisiz/origin hatalı yayın ve stale preview reddedildi. Eşzamanlı ilk yayın/tekrar tek snapshot üretti; eski istek B'yi ezmedi. Transaction rollback doğrulandı.
- [x] Commit sonrası yanıt kaybı ve admin reload/güvenli tekrar; İstanbul ay seçimi, boş ay, geçmiş raf, yayımlanmış gelecek ayın gizlenmesi ve ortak kapak stili doğrulandı.
- [x] Unit 7/7, yerel PostgreSQL entegrasyon 6/6, ayrı kabul DB'sinde development ve production Playwright 15/15; lint/typecheck/build geçti.
- [ ] Gerçek Neon/Netlify primary bağlantı, HTML/RSC/CDN ve altyapı kesintisinden toparlanma kabulü yapılmadı. Yerel production testi canlı kabul değildir.

Ayrıntılı test ortamı, inceleme bulguları ve kullanım: [yayın teslimi](MONTHLY_READ_PUBLISHING_DELIVERY.md). [İlk admin kılavuzu](ADMIN_FIRST_DELIVERY.md), [PostgreSQL test kılavuzu](LOCAL_POSTGRES_TESTS.md).

## Sonraki işler

Gerçek PO içeriği ve işletim hesabı, canlı hizmet doğrulaması, tam ay/yıl geçişi, gerçek kapak, numara otomasyonu, kitap seçimi/tekrar atama, mail/ziyaretçi formları ve kalan tasarım çalışmaları açık. Elle numara girişi uygulandı; yeni PO kararı gerekmedi. Kişisel adresli yerel karar/oturum belgeleri ve paylaşım PDF'si paylaşılabilir kapsamın dışındadır; bu özet onlara bağımlı bağlantı içermez.
