# Ayın Kitabı — ilk teslim uygulama planı

**Durum:** İlk teslim 15 Kasım 2026’da uygulandı ve yerelde doğrulandı. Gerçek Neon ve Netlify doğrulaması açık. [Uygulama ve test kaydı](../../ADMIN_FIRST_DELIVERY.md), [sonraki işler](../../MONTHLY_READ_DECISIONS.md#sonraki-işler).

**Dayanak:** [Paylaşılabilir içerik/yayın kuralları](../../MONTHLY_READ_DECISIONS.md#içerik-ve-yayın-kuralları), [giriş kuralları](../../MONTHLY_READ_DECISIONS.md#giriş-ve-çalışma-kuralları), [yerel kabul](../../MONTHLY_READ_DECISIONS.md#yerel-kabul). Bu plan yalnızca ilk admin teslimini kapsar.

## 1. Hedef ve kapsam

Ortak admin hesabıyla giriş yapıp bir ayın kitabını ve TR/EN şerit metnini kalıcı taslak olarak kaydetmek; kaydedilmiş taslağı yalnız adminin görebileceği şekilde önizlemek.

- Mevcut apps/web, Better Auth, Neon PostgreSQL ve Drizzle kullanılacak.
- Ziyaretçi sayfaları mevcut demo verisini okumaya devam edecek. Public TR/EN düzeni, yönlendirmesi ve görünümü değişmeyecek.
- Bu teslim ay başına tek taslağı doğrulayacak.
- Ortak kitap seçicisi, aynı kitabın başka aya atanmasının engellenmesi ve bunun testleri yayın teslimine bırakılacak. İlk migration’da kitap ilişkisine aylar arası benzersizlik kısıtı eklenmeyecek.
- Gerçek yayın, ay geçişi, cache yenileme, kapak yükleme ve okuma numarası yönetimi kapsam dışında kalacak.
- Turnstile/honeypot ziyaretçi formlarının sonraki entegrasyonuna ait olacak; admin girişine eklenmeyecek. Bu ayrım [paylaşılabilir giriş kuralıyla](../../MONTHLY_READ_DECISIONS.md#giriş-ve-çalışma-kuralları) uyumlu.

## 2. Admin girişi ve gerçek istekte deneme sınırı

### Giriş ve yetkilendirme

- /admin için ayrı Türkçe kök layout oluşturulacak: apps/web/src/app/admin/layout.tsx, kendi `<html lang="tr">` ve `<body>` öğelerini, admin stillerini ve indeksleme engelini içerecek.
- Mevcut [locale]/layout.tsx, public bileşenler ve dil proxy’si değiştirilmeyecek.
- /admin/giris başarılı girişten sonra doğrudan Ayın Kitabı editörüne yönlendirecek.
- Better Auth e-posta/parola girişi kullanılacak. Public kayıt, OAuth ve şifre kurtarma kapalı kalacak.
- Tek ortak hesap, migration sonrasında terminalden çalışan idempotent bootstrap komutuyla oluşturulacak. Tekrar çalıştırma ikinci hesap yaratmayacak veya parolayı değiştirmeyecek.
- Admin yetkisi, Better Auth kullanıcı kimliğine bağlı tek site_admin kaydıyla belirlenecek. Her taslak okuması, kayıt ve önizleme sunucuda oturum ve yetki kontrolü yapacak.
- Aynı hesabın iki oturumu birlikte çalışabilecek. Oturum girişten itibaren yedi gün sürecek; otomatik uzatma kapalı olacak. Çıkış yalnız mevcut oturumu kapatacak.

### 15 dakika / 5 başarısız deneme

Koruma, giriş ekranının JavaScript’ine değil, gerçek POST /api/auth/sign-in/email isteğine uygulanacak:
1. Route Handler, Better Auth’a iletmeden önce normalize edilmiş hesap adresini ve güvenilir istemci IP’sini belirleyecek. Doğrudan endpoint isteği aynı denetimden geçecek.
2. Neon’da IP ve hesap için iki bağımsız başarısızlık geçmişi tutulacak. Son 900 saniyede herhangi birinde beş başarısızlık varsa istek 429 ve Retry-After ile reddedilecek; parola doğrulaması çalıştırılmayacak.
3. Eşik aşılmamışsa gerçek Better Auth doğrulaması yapılacak. Yanlış parola ve bulunmayan hesap gibi kimlik bilgisi retleri her iki geçmişe bir kez eklenecek. Başarılı giriş, bozuk istek ve altyapı hataları başarısız parola denemesi sayılmayacak.
4. Başarılı giriş önceki başarısızlıkları silmeyecek. Engellenmiş istekler süreyi uzatmayacak; pencere kayan 15 dakika olarak işleyecek.
5. Yarışı önlemek için IP/hesap kilit kayıtları sabit sırayla PostgreSQL transaction kilidiyle alınacak; kontrol, doğrulama sonucu ve sayaç kaydı aynı kilit altında sıralanacak. Auth sorguları ayrı bağlantı kullanacak; havuz buna uygun yapılandırılacak.
6. Better Auth yanıtı, sayaç transaction’ı tamamlanmadan istemciye iletilmeyecek. DB/limiter hatasında giriş kapalı kalacak; oturum cookie’si gönderilmeyecek.
7. Bu endpoint’te Better Auth’ın varsayılan istek sayacı, başarısız-deneme kuralının yerine kullanılmayacak. Origin/CSRF denetimleri korunacak.
IP kaynağı yalnız güvenilen altyapıdan alınacak; istemcinin keyfî X-Forwarded-For değeri kabul edilmeyecek. Parola ve cookie/token loglanmayacak.

## 3. Taslak, eşzamanlı kayıt ve önizleme

### Veri ve migration

- Kitap kaydı: kalıcı kimlik, TR/EN başlık ve ortak yazar.
- Aylık taslak: benzersiz okuma ayı, kitap ilişkisi, TR/EN şerit metni, sürüm ve son kayıt zamanı.
- Ay zorunlu olacak; metinler eksik bırakılarak taslak kaydedilebilecek. Metinler düz yazı olarak güvenli gösterilecek.
- Kitap alanları ve iki şerit metni tek transaction içinde kaydedilecek.
- Drizzle migration’ları sürümlenecek ve ayrı komutla uygulanacak. Web runtime’ı şema oluşturmayacak veya değiştirmeyecek.
- DB/auth başlatma admin tarafına bağlı kalacak; public sayfalar bu yapılandırma veya bağlantıyı gerektirmeyecek.

### Arayüzler ve kayıt davranışı

| Arayüz | Davranış |
| --- | --- |
| GET /api/admin/ayin-kitabi/[period] | Yetkili kullanıcıya taslağı veya null döndürür; kayıt oluşturmaz |
| PUT /api/admin/ayin-kitabi/[period] | Kitap alanları, TR/EN şerit metni ve expectedVersion alır |
| Editör | /admin/ayin-kitabi?ay=YYYY-MM |
| Özel önizleme | /admin/ayin-kitabi/onizleme?ay=YYYY-MM&dil=tr\|en |

- İlk kayıt `expectedVersion: null` ile yapılacak. Aynı ay eşzamanlı oluşturulursa benzersiz ay kısıtı ikinci kaydı 409 ile reddedecek; mevcut kaydı güncellemeyecek.
- Güncelleme yalnız kayıtlı sürüm `expectedVersion` ile eşleşirse gerçekleşecek; sürüm atomik olarak artırılacak.
- Eski sürümde 409 dönecek ve kitap alanları dahil hiçbir değişiklik yazılmayacak.
- Çakışmada kullanıcının formu korunacak; son kayıt ayrı gösterilecek. Son kaydı yüklemek yerel değişiklikleri silmeden önce onay isteyecek. Otomatik üzerine yazma, birleştirme veya tekrar deneme olmayacak.
- Manuel kayıt ve kaydedilmemiş değişiklikle ayrılma uyarısı olacak. Ağ/DB hatasında veya oturum dolduğunda form metni korunacak; yeniden giriş ayrı sekmede yapılabilecek.
- Önizleme yalnız son kaydedilmiş sürümü okuyacak; sürüm ve kayıt zamanını gösterecek. Kaydedilmemiş değişiklikler için önce kayıt istenecek.
- Kapak ve numara eksikliği açık yer tutucularla gösterilecek. Taslak metinleri URL’ye veya localStorage’a yazılmayacak.
- Admin/önizleme/API yanıtları private, no-store ve indeksleme engeli taşıyacak. Yetki kontrolü yalnız layout’a bırakılmayacak.

## 4. Kabul kontrolleri ve uygulama sırası

Uygulama sırası: migration/veri temeli → giriş ve gerçek endpoint koruması → sürümlü kayıt → editör/önizleme → regresyon kontrolleri. Her adım ilgili başarısız testle başlayacak.

| Alan | Kabul ölçütü |
| --- | --- |
| Gerçek login isteği | Doğrudan HTTP ile beş yanlış parola gerçek Better Auth doğrulamasından geçer; altıncı istek doğru parola taşısa bile 429 alır ve doğrulama çalışmaz. |
| IP ve hesap ayrımı | Aynı hesap/farklı IP ve aynı IP/farklı hesap denemeleri kendi sınırlarına takılır. İlgisiz IP ve hesap engellenmez. Sahte IP başlığı sınırı aşamaz. |
| Süre ve yarış | Kontrollü saatle 900 saniyelik pencere ve Retry-After doğrulanır. Paralel girişler ve iki uygulama süreci beş başarısızlık sınırını aşamaz; yeniden başlatma geçmişi silmez. |
| Başarı ve hata ayrımı | Başarılı girişler sayacı artırmaz; mevcut başarısızlıkları silmez. Auth/DB hataları yanlış parola sayılmaz. Limiter arızasında cookie verilmez. |
| Yetki | Public kayıt reddedilir. Oturumsuz, sahte/süresi dolmuş cookie’li veya admin olmayan kullanıcı taslağı okuyamaz, kaydedemez veya önizleyemez. |
| Ay başına tek taslak | Aynı ayın eşzamanlı ilk kayıtlarından yalnız biri oluşur. Farklı aylar ayrı taslaklar tutabilir. |
| Eski sürüm | A ve B aynı sürümü açar; A kaydeder, B 409 alır. A’nın kaydı ve B’nin form metni korunur. |
| Transaction ve kalıcılık | Kısmi hata tüm kaydı geri alır. Yenileme, yeniden giriş ve sunucu yeniden başlatma sonrasında taslak korunur. |
| Önizleme ve yalıtım | TR/EN önizleme kaydedilmiş sürümü gösterir. Benzersiz taslak test metni public HTML, RSC, ağ yanıtları veya metadata içinde bulunmaz. |
| Regresyon | Public TR/EN düzeni ve mevcut dokuz E2E akışı korunur; typecheck, lint ve build geçer. Public taraf DB/admin ortam değişkenleri olmadan açılır. |

Yarış, transaction ve sayaç testleri ayrı gerçek PostgreSQL test veritabanında çalıştırılacak. Login kabulü, yalnız limiter birim testiyle veya sahte auth sonucu ile tamamlanmış sayılmayacak.

## 5. Açık noktalar ve sonraki teslim

Bu revizyonda bloklayan yeni ürün kararı yok. Teknik varsayımlar: kaydedilmiş sürüm önizlemesi, kayan 15 dakikalık giriş penceresi, girişten itibaren sabit yedi günlük oturum ve kapak/numara yer tutucuları.

Yayın tesliminde: ortak kitap seçicisi, aynı kitap kimliğinin başka aya atanmasını engelleyen kural ve testleri; gerçek yayın, public veri bağlantısı, ay geçişi ve cache yenileme ele alınacak.

## Teknik doğrulama kapsamı

Yerel IP kaynağı ve eşzamanlı giriş/bağlantı havuzu kontrolleri [ilk teslimde](../../ADMIN_FIRST_DELIVERY.md#15-kasım-2026-doğrulama-kaydı) doğrulandı. Netlify’de güvenilir IP başlığı davranışı canlıda doğrulanacak.

- **Güvenilir istemci IP’si:** Yerel geliştirme ve Netlify için IP’nin hangi güvenilir kaynaktan ve hangi çalışma ortamında elde edileceğini ayrı ayrı doğrula. İstemcinin gönderdiği keyfî yönlendirme başlığını güvenilir kabul etme. Yerel doğrulamayı Netlify ortamında yapılmış test gibi raporlama.
- **Eşzamanlı giriş ve bağlantı havuzu:** Deneme sayacı kilidi tutulurken Better Auth’un kendi veritabanı sorguları için bağlantı alabildiğini doğrula. Birden fazla giriş isteği bağlantı havuzunu doldurduğunda karşılıklı bekleme, zaman aşımı veya oturum yanıtı sızıntısı olmadığını gerçek test veritabanında kontrol et.

Gerçek entegrasyon doğrulaması için geliştirme ve test veritabanları ayrı tutulur. Bağlantı bilgileri, oturum sırrı ve admin parolası Git’e eklenmeyen ortam ayarlarından sağlanır.
