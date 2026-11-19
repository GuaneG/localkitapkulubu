# Admin kullanım ve tasarım kılavuzu

17 Kasım 2026. **Kullanıcı tarafından onaylanan ve uygulanan standart:** giriş sonrası ana menü ve görsel Ayın Kitabı editörü, sonraki bütün admin özelliklerinin tasarım ve etkileşim referansıdır. Yerel doğrulama ile Netlify/Neon deneme ortamı doğrulaması ayrı tutulur. Bu teslimde deploy yapılmaz.

## PO için kullanım

1. `/admin/giris` üzerinden giriş yapın. `/admin` ana menüsünde **Ayın Kitabı’nı aç** bağlantısını seçin.
2. **Kayıtlı taslaklar** listesinden ayı açın veya **Yeni ay** ile okuma ayını seçip **Ayı aç** deyin. Ay seçmek veritabanına kayıt eklemez. Ay başına tek taslak vardır.
3. Sekmelerin dışındaki ortak **Okuma numarası** alanına yalnız sayıyı (örneğin `38`) yazın; `#` yazmayın. Alan isteğe bağlıdır: boş bırakınca numarasız başlık, 38 yazınca iki dilde de `Read of the month #38` görünür. Pozitif tam sayı gerekir (1–2147483647); otomatik artmaz. İlk gerçek taslağa 38’i PO girecek. Ortak yazar alanını ve **Türkçe / İngilizce** sekmelerindeki etiketli kitap adı/şerit alanlarını doldurun. Dil sekmesi değişince metniniz korunur; admin arayüzü Türkçe kalır.
4. **Anlık önizleme** formdaki yazıyı hemen gösterir. **Son kayıt** veritabanından yüklenmiş/son kaydedilmiş taslağı, **Bu ayın yayını** o ayın yayınlanmış değişmez kopyasını gösterir. Bu üç kaynak birbirinden ayrıdır. **Önizlemeyi büyüt** alanları kapatır, metni silmez.
5. **Taslağı kaydet** yalnız taslağı yazar. Okuma numarası boş ve beş metin alanının tamamı boş veya yalnız boşluksa form anlaşılır mesaj verir; sunucu da kaydı 422 ile reddeder. Geçerli yalnız numara veya kısmi TR/EN metin kaydedilebilir; yayın için beş zorunlu metnin tamamı gerekir. Önceden oluşmuş boş taslaklar listede **Boş taslak** olarak açılıp düzenlenebilir; otomatik silinmez.
6. **Yayın öncesi son kontrol** yalnız kaydedilmiş sürümü açar. Kaydedilmemiş değişiklik varsa önce kaydetmeniz istenir. TR/EN zorunlu alanları tamamlanınca bu ayrı ekrandaki **Yayınla** işlemi kullanılabilir. Taslak kaydetmek yayınlamak değildir.

Ziyaretçi iki dilde son yayınlanmış içeriği ve o yayının okuma numarasını görür. 38 yayındayken 39’u taslak kaydetmek yayındaki 38’i değiştirmez. Anlık önizleme yazarken 39’u, son kontrol kaydedilmiş 39’u, **Bu ayın yayını** hâlâ 38’i gösterir. Numara boşaltılıp kaydedilebilir; ziyaretçinin numarası ancak ayrı yayın onayından sonra kalkar. Ana sayfa İstanbul saatine göre güncel ayı seçer; başka ayın yayını güncel ayın şeridini değiştirmez. Kapak yer tutucusu korunur.

Ay/listeden başka kayda, ana menüye veya çıkışa geçerken kaydedilmemiş değişiklikler için uyarı çıkar. Tarayıcı kapatma/yenilemede yerel tarayıcı uyarısı kullanılır. Metin localStorage’a veya URL’ye yazılmaz. Oturum sona ererse form korunur; ayrı sekmede giriş yapıp yeniden kaydetmek mümkündür. Çakışmada form korunur, son kayıt ayrı gösterilir; üzerine almak için **Son kaydı yükle** onayı gerekir.

## Yeni admin ekranlarının ortak standardı

Mevcut düzeni ve bileşenleri kullanın; her özellik için ayrı bir tasarım sistemi kurmayın. `Courier New, monospace`, açık `#faf8f9` zemin, `#171717` metin, `#89667c` vurgu, kare kenarlı kontroller ve görünür klavye odağı ortak CSS’te tanımlıdır. Başlık, üst gezinme, ana/ikincil düğmeler, etiketli alanlar, hata ve işlem durumları aynı görünüm ve erişilebilirlik kurallarını izler. Dar ekranda sütunlar alt alta gelir; ziyaretçi mobil tasarımına onay anlamına gelmez.

| Ortak parça | Dosya | Bugünkü kullanım / yeni ekranın sorumluluğu |
| --- | --- | --- |
| Sayfa başlığı ve gezinme | [AdminPageHeader](../apps/web/src/app/admin/components/admin-page-header.tsx) | Giriş, ana menü, editör, son kontrol. Başlık/alt açıklama/gezinme verilir; yetki kontrolü çağırandadır. |
| Düğmeler | [AdminButton](../apps/web/src/app/admin/components/admin-button.tsx) | Bütün admin işlem düğmeleri. Native type, disabled ve erişilebilir isim korunur; kaydetme/yayınlama kodu özellik ekranındadır. |
| Etiketli alan | [AdminField](../apps/web/src/app/admin/components/admin-field.tsx) | Giriş ve editör; ortak okuma numarası için native number/min/max/step ve açıklama bağlantısı da aynı bileşendedir. Input/textarea, label ve id ilişkisini paylaşır; alan iş kuralları özellik doğrulamasındadır. |
| Bilgi, hata, işlem sonucu | [AdminNotice](../apps/web/src/app/admin/components/admin-notice.tsx) | Giriş, menü, editör, son kontrol/yayın. Hata alert, başarı status; metin PO’nun anlayacağı dildedir. |
| Sekmeler | [AdminTabs](../apps/web/src/app/admin/components/admin-tabs.tsx) | Editörde dil ve önizleme kaynağı. ARIA ilişkileri, ok/Home/End ve Tab odağı ortak; seçilen veri özellik ekranındadır. |
| Taslak durumu | [DraftStatus](../apps/web/src/app/admin/components/draft-status.tsx) | Taslak listesi, editör ve son kontrol. Boş/taslak/yayında/yeni değişiklik ayrımı. |
| Görünüm ve metin yardımcıları | [admin.module.css](../apps/web/src/app/admin/admin.module.css), [presentation.ts](../apps/web/src/app/admin/presentation.ts) | Ekran düzeni, İstanbul’a göre tarih/ay ve durum metni. İşlem/veritabanı katmanı değildir. |
| Gerçek site şeridi | [MonthlyReadBand](../apps/web/src/components/monthly-read-band.tsx) | Ziyaretçi ana sayfası, anlık/kayıtlı/yayın önizlemesi ve özel son kontrol. Admin için kopya şerit üretilmez. |

Referans ekranları: [ana menü](../apps/web/src/app/admin/admin-menu.tsx), [DraftEditor](../apps/web/src/app/admin/draft-editor.tsx), [özel son kontrol](../apps/web/src/app/admin/ayin-kitabi/onizleme/page.tsx), [yayın düğmesi](../apps/web/src/app/admin/publish-button.tsx). Ayın Kitabı alanları, form state’i, kayıt ve çakışma akışı kendi ekranında kalır. Sadece görünüm/erişilebilirlik paylaşılır; varsayımsal genel CRUD/editör motoru eklenmez.

İçerik yayımlayan yeni özelliklerde de **taslak kaydet → kaydedilmiş sürümü özel önizle → ayrı yayın onayı** sırası uygulanır; özellik kendi yayın zorunluluklarını sunucuda doğrular. Ziyaretçi yalnız yayın kopyasını okur. Layout, menünün gizlenmesi veya istemci düğmesi bir yetki sınırı değildir: her ilgili sunucu okuma/yazması admin kontrolü yapar.

## Teknik tercihler ve sınırlar

- **Onaylı tercih:** etiketli alanlar + gerçek şerit önizlemesi; doğrudan şerit üstünde düzenleme tercih edilmedi. Dil sekmeleri dar alanı sadeleştirir, alan etiketleri yazının yerini anlaşılır tutar. Yan şerit dar kapsayıcıya uyar; public sayfayla birebir piksel genişliği vaat etmez. Büyütme ve ayrı son kontrol daha geniş alan sağlar.
- **İlk menü/editör tesliminin tercihi:** liste yalnız ay/başlık/durum/sürüm/tarih özetini döndürür; tam metinler detayda bulunur. Mevcut servis ve hata/özel yanıt yardımcıları yeniden kullanılır. Sayfalama, yeni paket ve otomatik boş kayıt temizliği eklenmedi. Sonraki okuma numarası teslimi nullable iki alan için [0002 migration’ını](../apps/web/drizzle/0002_reading_number.sql) ekler; [deploy sırası ve kanıt](READING_NUMBER_DELIVERY.md).
- **Uygulama tercihi:** admin detayında yayın kopyası aynı okumanın `publication.revisionId` kimliğinden bulunur. Arada yeni yayın olsa da eldeki receipt ve snapshot birlikte tutarlı kalır. Gerçek eksik revision, yayın yok gibi gizlenmez.
- **Uygulama tercihi:** sunucudan gelen editör alanları, React olayları bağlanana kadar etkin değildir. Böylece hızlı sekme tıklaması veya yazı girişi hydration sırasında kaybolmaz. Kaydetmede mevcut `expectedVersion`, satır kilidi ve çakışma koruması sürer.
- Kitap kimliğiyle başka aya tekrar atama, gerçek kapak yükleme, okuma numarası otomasyonu ve tam ay geçişi bu teslimin dışında kalır. Yeni PO tasarım kararı beklenmiyor.

## Doğrulama kaydı

Tekrarlanabilir tarayıcı senaryoları: [admin-editor.spec.ts](../apps/web/e2e/admin-editor.spec.ts), [admin.spec.ts](../apps/web/e2e/admin.spec.ts), [publication.spec.ts](../apps/web/e2e/publication.spec.ts). Veri değiştiren kabul testlerinde ayrılmış yerel PostgreSQL kabul DB’si ve disposable admin kullanılır; gerçek Neon veya normal geliştirme DB’si resetlenmez. [Yerel test ayrımı](LOCAL_POSTGRES_TESTS.md). Aşağıdaki özet paylaşılabilir kanıttır; kişisel oturum/işletim notları GitHub kılavuzunun bağımlılığı değildir.

### Yerel kabul — 17 Kasım 2026

**Güncel ek teslim:** ortak okuma numarası, taslak/yayın kopyasında saklama ve 38→39 ayrımı uygulanmıştır. Güncel komut sonuçları, güvenlik incelemesi ve Netlify öncesi zorunlu migration [okuma numarası teslimindedir](READING_NUMBER_DELIVERY.md). Aşağıdaki sayılar ilk menü/editör tesliminin tarihsel sonuçlarıdır.

Admin teslimi, başlangıç Next 16.4.2 bağımlılıklarıyla lint/typecheck, unit **8/8**, ayrı Compose PostgreSQL entegrasyonu **7/7**, build ve ayrı kabul DB’sinde development/production Playwright **16/16 + 16/16** ile doğrulandı; atlanan senaryo yok. Bu kayıt yerel kabul içindir. Sonraki bağımlılık güncellemelerinin sürüm ve test kanıtı kendi teslim kapsamındadır.

- Giriş → `/admin` → Ayın Kitabı; iki dilde kitap adı/şerit metninin anlık görünmesi ve sekmelerde korunması.
- İki farklı ayın gerçek kaydı, reload sonrası listeden iki kaydın ve iki dilin yeniden açılması.
- Blank/whitespace kayda form mesajı ve sunucuda 422; partial kayıt başarısı ve legacy boş kaydın düzenlenmesi.
- Kirli formda ay değiştirme uyarısı; eski oturumun 409 yanıtında metin korunması; anonim/süresi bitmiş/nonadmin liste erişiminin reddi.
- A yayında → B taslağını kaydet → editörü reload et ve B’yi özel TR/EN önizlemede gör → anonim TR/EN’de A → B yayınla → anonim iki dilde B. Kaydedilmiş/yayınlanmış kaynaklar ayrı kalır.
- Genişlet/düzenlemeye dön ve dar ekranda taşma kontrolü; gerçek Playwright ekran görüntülerinin gözle incelenmesi.

Netlify/Neon deneme ortamında bu yeni arayüzün kabulü ayrıca açıktır. Gerçek Node/pnpm ve platform adapter ayarları, IP/oturum/origin sınırı, iki ay kaydı ile TR/EN A/B HTML/RSC/CDN davranışı yetkili deneme ortamında doğrulanmalıdır. Önceki yayın altyapısının ortam sınırları [yayın tesliminde](MONTHLY_READ_PUBLISHING_DELIVERY.md) korunur.

Deploy’dan önce değişen yetki/veri/dış bağımlılıklar `security-audit` ile incelenir; bağımlılık değişince `pnpm audit --prod` ve `pnpm audit` çalıştırılır. Deploy’dan sonra yetkili deneme ortamında ilgili akış ve sağlayıcı ayarları doğrulanır. İlk halka açık yayın öncesi site geneli inceleme ayrıdır. Admin arayüzü teslimi yeni paket eklemez; yerel test başarısı bağımlılık bulgularını veya canlı kabulü kapatmaz.
