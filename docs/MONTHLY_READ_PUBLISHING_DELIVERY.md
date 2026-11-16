# Ayın Kitabı — yayınlama teslimi

Son güncelleme: **16 Kasım 2026**. Yayınlama uygulandı ve ayrı yerel test veritabanlarında doğrulandı. Canlı Netlify/Neon kabulü açık. [Plan](superpowers/plans/2026-11-15-ayin-kitabi-yayinlama.md), [ilk admin teslimi](ADMIN_FIRST_DELIVERY.md).

## Kapsam

Kaydedilmiş TR/EN taslaktan özel önizleme üzerinden yayın; değişmez yayın kopyası ve ay başına tek güncel referans. Taslak düzenlenirken ziyaretçi son yayını görür. Home referansları primary PostgreSQL'den taze, payload yalnız revision ID ile cache'ten okunur. Pending/cache retry akışı yok. Kapak yer tutucusu, numarasız başlık ve İstanbul güncel ay seçimi korunur.

Gerçek kapak yükleme, okuma numarası, kitap seçicisi/kimlikle tekrar atama yasağı, yayından kaldırma ve tam gece yarısı/yıl geçişi kabulü ayrı teslimdir.

## Doğrulama kaydı

| Kontrol | Ortam / sonuç |
| --- | --- |
| Başlangıç `pnpm test:unit` | Node alt süreçleri sandbox'ta EPERM; aynı komut yükseltilmiş yerel çalıştırmada **2/2 geçti**. |
| Başlangıç `.\scripts\test-postgres.ps1` | Ayrı Compose PostgreSQL 18 veritabanı; **3/3 geçti**, atlanan yok. |
| Son `pnpm test:unit` | **7/7 geçti**, atlanan yok. İstanbul ay seçimi, snapshot seçimi, geciken A cache yazımı ve aynı ID ile cache hata fallback'i dahil. Cache yarış/hata kontrolleri enjekte edilen okuyucuyla uygulama seçimini sınar; gerçek Netlify cache arızası değildir. |
| Son `.\scripts\test-postgres.ps1` | Compose PostgreSQL 18 üzerinde **6/6 geçti**, atlanan yok. İlk aynı sürüm yayınının eşzamanlı iki gönderimi, save/publish iki kilit sırası, rollback, immutable A ve sürüm çakışması dahil. |
| `pnpm test:e2e` — development | Ayrı kabul DB'si, sahte test admini, kurulu Chrome; **15/15 geçti, 30,2 s**, atlanan yok. Normal geliştirme/Neon verisi kullanılmadı. |
| `pnpm test:e2e` — production build/start | Ayrı `.next-publication-production`, `PLAYWRIGHT_PRODUCTION=1`, aynı ayrı kabul DB'si; **15/15 geçti, 15,7 s**, atlanan yok. |
| `pnpm lint`, `pnpm typecheck`, `pnpm build` | **Geçti**. Lint hatası/uyarısı yok. Build'de Home dinamik; diğer mevcut public sayfalar statik kalıyor. Test çıktı dizinlerinin tip yollarını Next otomatik ekledi. |
| Drizzle metadata kontrolü | Eksik snapshot ile izole `generate` yeniden iki `CREATE TABLE` üretti; yerel generator'dan `0001_snapshot.json` eklenince ayrı kopyada **“No schema changes, nothing to migrate”**. DB'ye üretilen tekrar SQL uygulanmadı. |
| Netlify + Neon | **Çalıştırılmadı.** Gerçek primary bağlantı, CDN/HTML/RSC davranışı, IP başlıkları, soğuk başlangıç ve bağlantı limitleri ayrıca doğrulanmalı. Commit/push/deploy yapılmadı. |

## Ana kabulün kanıtı

[publication.spec.ts](../apps/web/e2e/publication.spec.ts) içindeki `saved B survives reload while anonymous TR/EN keep A until B is published` testi şu akışı gerçek UI/PUT/POST ve PostgreSQL ile tamamladı:

1. İstanbul'a göre o anki aya benzersiz TR/EN A içeriği kaydedildi, özel önizlemeden yayımlandı. Yeni, cookiesiz context ile iki dilde A görüldü.
2. Beş alanın tamamı B yapılıp kaydedildi. Editör yeniden yüklendi; TR/EN başlık, yazar, TR/EN şerit alanları ve kayıt sürümü B olarak doğrulandı. Özel iki dil önizlemesi B gösterdi.
3. Yeni cookiesiz TR/EN sayfaları ve gerçek `RSC: 1` yanıtları hâlâ A içeriyordu; B işaretleri yoktu. HTML/RSC `no-store` başlıkları kontrol edildi.
4. B yayın isteği gerçekten commit edildi, yalnız tarayıcıya yanıtı düşürüldü. Admin belirsiz sonucu gösterirken yeni anonim iki dil isteği B gösterdi. Preview reload son yayın sürümünü doğruladı. Aynı sürüm iki paralel istekle tekrarlandı: aynı revision ID, DB'de tek snapshot. Eski A tekrarı `409`; B değişmedi.

Ayrı E2E; anonim/origin reddi, eksik iki dilde `422` ve disabled yayın, stale preview `409`, body alanı sahteciliğinin reddini doğrular. Boş güncel ayda açıklanmamış görünüm, geçmiş rafın kalması ve gerçekten yayımlanmış gelecek ayın gizlenmesi iki dilde sınandı. Önizleme/public kapak transform ve kitap sırtı stilleri eşitliği de aynı ana kabulde kontrol edilir. Son önizleme ekran görüntüsü yerelde açılıp incelendi.

İlk ana test sürümü numarasız önizleme yokken başarısız oldu. Sonraki test sorunları: Drizzle hatasının `cause` içinde olması; textarea için exact label seçiminin başlangıç metniyle uyuşmaması; Next route announcer ile alert çakışması. Kontroller gevşetilmeden doğru hata/erişilebilir textbox/main alert hedeflendi. İlk agent'ın raporlanmamış RED adımları doğrulanmış sayılmadı. Development çalışmasında mevcut galeri görseline ait bir LCP önerisi görüldü; yayın akışıyla ilişkili değil, production testleri geçti.

## Kullanım ve tekrar çalıştırma

Mevcut admin ortamını [ilk teslim kılavuzuna](ADMIN_FIRST_DELIVERY.md#yerel-kullanım) göre hazırlayın ve yeni migration için `pnpm db:migrate` çalıştırın. Editörde ayı açın, alanları kaydedin, TR/EN özel önizlemeyi kontrol edin; **Yayınla** kaydedilmiş sürümü yayımlar. Eksikler önizlemede listelenir. Yayın sonrası editör kaydı son yayını değiştirmez; yeni sürüm tekrar önizlenip yayımlanır. Aynı sürümü tekrar yayınlamak ikinci snapshot oluşturmaz. Yeni kayıt olmuşsa eski yayın isteği `409` alır.

Playwright için migrate edilmiş, test admini provision edilmiş **ayrı kabul DB'si** kullanın. Sunucunun `DATABASE_URL` ve testin `TEST_DATABASE_URL` değeri yalnız bu DB'yi göstermeli; entegrasyon testlerinin reset DB'siyle eşzamanlı paylaşılmamalı. `ADMIN_EMAIL`/`ADMIN_PASSWORD`, `BETTER_AUTH_URL`/`BETTER_AUTH_SECRET` yalnız test hesabı ve yerel origin için tanımlanır. Değerleri Git'e veya çıktıya yazmayın. `PLAYWRIGHT_CHANNEL=chrome` ile kurulu Chrome kullanılabilir; örneğin port 3100 seçildiğinde `PLAYWRIGHT_PORT` ve auth origin aynı portu kullanır. `pnpm test:e2e` development sunucusunu başlatır. Production için aynı `NEXT_DIST_DIR` ile önce `pnpm build`, sonra `PLAYWRIGHT_PRODUCTION=1` ile `pnpm test:e2e` çalıştırın. Test DB ayarları yoksa ilgili testler atlanır; bu kabul değildir.

Fixture'lar yalnız kabul DB'sinde güncel ayı, 2000-01…12 geçmiş rafını, 2028-11, 2090-01, 2091-01 dönemlerini ve test oturumlarını değiştirir. Boş ay testinin geçici referans kaldırması test fixture işlemidir; ürünün yayından kaldırma özelliği uygulanmış değildir. Next test sunucuları çalışma sonunda kapandı; Compose test servisi mevcut test kılavuzuna uygun yeniden kullanım için açık bırakıldı.

## İnceleme ve kalan sınırlar

GPT-6 Astra iki önemli bulgu verdi: eksik Drizzle snapshot metadata'sı ve yalnız public CSS'te kalan perspektifli kapak. İkisi giderildi; uzman dar tekrar incelemede **ADDRESSED**, yeni önemli bulgu yok dedi. Kapak farkı production tarayıcıda önce `none`/`matrix3d` farkıyla kırmızı, ortak scoped CSS sonrası development ve production paketlerinde yeşil doğrulandı. Snapshot eksikliği de izole generator çıktısıyla önce/sonra doğrulandı.

Güncel referans her yeni Home sunucu isteğinde DB'ye bağlıdır; açık sekme/prefetch kendiliğinden yenilenmez. DB arızası açıklanmamış ay yerine geçici hata verir. Cache hata ve gecikme testleri uygulama bağımlılık sınırındadır; gerçek cache servisi kesintisi ve gerçek DB kesintisinde tarayıcı toparlanması işletim ortamında henüz sınanmadı. Ayın gece yarısı/yıl sınırı tam E2E kabulü ayrıdır. Yeni PO kararı gerekmedi; gerçek yayın içeriği ve sonraki kapak/numara/kitap seçimi kararları açık kalır.

## İş bölümü ve araçlar

- Ana agent: yarım veri katmanını doğrulayıp devraldı; service/API, özel önizleme yayını, ortak sunum, public seçim/cache, testler ve belgeleri tamamladı.
- `yayin_veri_uygulama` / native `uygulayici`, **GPT-6 Luna/high**: şema, migration SQL/journal, contracts/repository ve ilk testleri yazdı; kullanım sınırıyla raporsuz sonlandı. DONE/test iddiası yapılmadı; ana agent kalan işleri ve kontrolleri tamamladı.
- `yayin_uygulama_uzman_review` / native `uzman`, **GPT-6 Astra/high**: salt okunur bütün uygulama incelemesi ve iki düzeltmenin dar tekrar incelemesi. Testleri kendisi tekrar çalıştırmadı.
- Skill'ler: başlangıçta `superpowers:subagent-driven-development`, agent sınırından sonra `superpowers:executing-plans`; testler için `test-driven-development`, hata kökü için `systematic-debugging`, inceleme için `requesting-code-review`/`receiving-code-review`, sonuç kanıtı için `verification-before-completion`, React bileşenleri için `vercel:react-best-practices`. Uzman ayrıca `karpathy-guidelines` kullandı. `using-git-worktrees` ile mevcut ağaç değerlendirildi; uncommitted admin girdileri korunduğu için aynı feature branch'te çalışıldı. Windows/Bash kısıtı nedeniyle görev ledger/diff araçları Python eşdeğeriyle çalıştırıldı.
