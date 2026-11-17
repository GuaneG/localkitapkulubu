# Deploy öncesi bağımlılık güvenliği — 17 Kasım 2026

**Kapsam:** `codex/admin-menu-editor` dalındaki admin teslimini koruyarak mevcut pnpm bağımlılıklarını güncellemek. Yetki/taslak/yayın akışı değiştirilmez. Stage, commit, push veya deploy yapılmaz. Bu kayıt odaklı bağımlılık incelemesidir; site genelinde exploit testi veya gerçek Netlify/Neon kabulü değildir.

## Başlangıç taraması

Repo kökünden güncel `pnpm audit --prod` **2 moderate**, `pnpm audit` **3 moderate** bildirdi (ikisi de bulgu nedeniyle exit 1). Önceki üç bulgu güncel taramada yeniden doğrulandı; high/critical yok.

| Bulgu | Başlangıç zinciri ve kapsamı | İşlem durumu |
| --- | --- | --- |
| [Next GHSA-mfr8-8qww-v76h](https://github.com/vercel/next.js/security/advisories/GHSA-mfr8-8qww-v76h) | `@local/web → next@16.4.2`; ayrıca Better Auth’un `next` peer bağlantısı. Production ve tam tarama. | **Kapandı:** kararlı 16.4.6 ve ilgili Next paketleri kuruldu; son iki audit Next bulgusu bildirmiyor. |
| [esbuild GHSA-67mh-4wv8-2f99](https://github.com/evanw/esbuild/security/advisories/GHSA-67mh-4wv8-2f99) | `drizzle-kit@0.31.11 → @esbuild-kit/esm-loader@2.6.5 → @esbuild-kit/core-utils@3.3.2 → esbuild@0.18.20`; Better Auth optional peer’i üzerinden production taramasında da görünür. | **Açık:** uyumlu son kararlı Kit 0.31.11 aynı eski zinciri taşıyor. Kit’in doğrudan kullandığı esbuild 0.25.12 bu bulgunun kaynağı değil. |
| [minimatch GHSA-g3hv-75wg-m249](https://github.com/isaacs/minimatch/security/advisories/GHSA-g3hv-75wg-m249) | Başlangıçta `eslint-config-next → typescript-eslint / parser → typescript-estree@8.71.2 → minimatch@10.2.6`; import resolver/plugin üzerinden aynı düğüme ek yollar. | **Kapandı — 20:20 takibi:** TypeScript-ESLint 8.73.0 → minimatch **11.0.8**. Güncel audit minimatch bildirmiyor; paket yaşı kuralı korundu. |

## Sürüm ve kapsam tercihi

**Teknik tercih:** `next`, `@next/env` ve `eslint-config-next` aynı exact **16.4.6** sürümünde tutulur. [16.4.5 güvenlik yayını](https://github.com/vercel/next.js/releases/tag/v16.4.5) düzeltmeyi içerir; [16.4.6 kararlı yaması](https://github.com/vercel/next.js/releases/tag/v16.4.6) düzeltmelerin üzerine hata düzeltmelerini geri taşır. 16.5 canary, ana sürüm değişimi ve toplu bütün paket güncellemesi seçilmedi. Next’in Node `>=20.9.0`, React `^19.0.0` ve ESLint config’in ESLint `>=9` aralıkları mevcut Node 24 / React 19.3.1 / ESLint 9 ile uyumlu; nihai kanıt regresyon testidir.

Geniş `overrides`, audit ignore veya uyarıyı kapatma ayarı eklenmez. Üst paketin kararlı uyumlu çözümü yoksa gerçek zincir ve etki koşulu açık kaydedilir; temiz tarama uğruna prerelease veri aracı yükseltmesi yapılmaz.

Manifestte yalnız `next`, `@next/env`, `eslint-config-next` 16.4.2 → **16.4.6** değişti. Kilitte ilgili Next/SWC paketleri de 16.4.6. React/React DOM 19.3.1, TypeScript 5.9.3, ESLint 9.39.5, Better Auth 1.7.24 ve Drizzle sürümleri korunur. İlk Next güncellemesinde kilit paket tanımları karşılaştırmasında yalnız Next ailesinin 12 kaydı değişti; 29 admin/server/e2e dosyası korundu. **20:20 minimatch takibinde** manifest aynı kaldı, yalnız kilitte TypeScript-ESLint ailesi 8.73.0 ve minimatch 11.0.8 oldu. Her iki adımda frozen/strict-peer kurulum geçti; `pnpm-workspace.yaml` ve paket yaşı politikası değiştirilmedi.

## Son tarama ve açık bulgular

| Gerçek komut, son kilit | Başlangıç | Güncelleme sonrası | Çıkış |
| --- | --- | --- | --- |
| `pnpm audit --prod` | 2 moderate | **1 moderate: esbuild** | 1 — kalan bulgu var |
| `pnpm audit` | 3 moderate | **1 moderate esbuild + 1 high picomatch** | 1 — kalan bulgular var |

Gündüz Next güncellemesi sonrasında tam tarama 2 moderate (esbuild + minimatch), high/critical yoktu. **20:20 takibi sonrası** minimatch kapandı; aynı gün güncellenmiş picomatch duyurusu tam taramada high olarak görünür oldu. Üretim taramasında high/critical, tam taramada critical yok. **Temiz audit veya sıfır üretim bulgusu iddiası yoktur**. Tarama bilinen duyuruları kapsar; sonuçların sayıca aynı kalması iki farklı bulgunun birbirinin yerine geçtiğini gizlemez.

### esbuild: upstream kararlı düzeltme bekleniyor

Tam zincirler `apps/web → drizzle-kit → esm-loader → core-utils → esbuild@0.18.20` ve üretimde `apps/web → better-auth → drizzle-kit` optional peer’i üzerinden aynı alt zincirdir. [Kilit düğümleri](../pnpm-lock.yaml#L2865), [Kit düğümü](../pnpm-lock.yaml#L3824). Registry’de mevcut `drizzle-kit@0` son sürüm 0.31.11 ve manifesti `@esbuild-kit/esm-loader:^2.5.5` içeriyor. [Resmî upstream takip konusu](https://github.com/drizzle-team/drizzle-orm/issues/5481).

Kit kaldırılmadı: [drizzle.config.ts](../apps/web/drizzle.config.ts#L1) `defineConfig` kullanıyor, TypeScript bu dosyayı kontrol ediyor ve [önceki teslimde](MONTHLY_READ_PUBLISHING_DELIVERY.md) generator ile migration metadata kontrolü gerçekten yapılmış. Kaldırmak mevcut şema üretim aracını kaybettirir; kararlı ORM 0.45.4 yanında Kit 1.0 beta/RC’ye geçmek ayrı uyumluluk işi yaratır. İç esbuild 0.18 aralığını 0.25’e zorlamak upstream’in farklı API aralığını değiştireceğinden override seçilmedi. Better Auth sürümünü sırf optional peer görünümünü değiştirmek için yükseltmek tam taramadaki Kit zincirini çözmez.

Advisory’nin sömürü koşulu eski esbuild’in **serve** sunucusudur. Kurulu `core-utils` yalnız `transform`, `transformSync` ve `version` kullanıyor; burada `.serve(` bulunmadı. Repo scriptleri Next/Turbopack çalıştırır; runtime [migration okuyucusu](../apps/web/src/server/db/migrate.ts#L3) Drizzle ORM migrator kullanır. Ziyaretçi isteğinden bu eski serve özelliğine yol doğrulanmadı. Bu sınırlı kaynak kanıtı bulguyu kapatmaz; production audit’teki peer zinciri özellikle açık tutulur.

**Takip:** Kit’in kararlı uyumlu sürümü eski loader zincirini kaldırdığında üst paketi güncelle; config/typecheck, migration metadata ve ayrı DB regresyonlarını çalıştır. Eski esbuild ile serve sunucusu başlatma. Kit beta/RC veya araç değişimi bu turun dışında kalır. Deploy kararında bu kalan bulgu açık değerlendirilir.

### Minimatch takibi tamamlandı

**17 Kasım, kullanıcının 20:20 devam talebi sonrası uygulandı.** Rapordaki hedefli komut aynen yeniden çalıştırıldı ve exit 0 verdi. Güncel yol `eslint-config-next@16.4.6 → typescript-eslint@8.73.0 / parser@8.73.0 → typescript-estree@8.73.0 → minimatch@11.0.8`. [AST okuyucunun kesin bağımlılığı](../pnpm-lock.yaml#L3454), [minimatch paketi](../pnpm-lock.yaml#L2161). Parser/import resolver üzerinden gelen aynı düğüm de güncellendi; 10.2.6 kilitten çıktı. ESLint’in etkilenmeyen 3.1.5 kolları korunur.

[8.73.0 kararlı üst sürümü](https://github.com/typescript-eslint/typescript-eslint/releases/tag/v8.73.0) ve [resmî düzeltme PR’ı](https://github.com/typescript-eslint/typescript-eslint/pull/13145) mevcut. Üst paketin `minimatch:^11.0.1` aralığı **11.0.8** ile karşılandı; yeni audit’lerde minimatch uyarısı yok. Gündüz 24 saatlik paket yaşı dolmadığından 8.72.2 seçilmiş ve çözmeyen ara değişiklik alınmamıştı. Akşam yeniden çözümlemede 8.73.0 seçildi. [pnpm 11’in 1440 dakika varsayılanı](https://github.com/pnpm/pnpm.io/blob/main/blog/releases/11.0.md), manifest ve workspace dosyası değişmeden korundu; exception, override veya doğrudan parser bağımlılığı eklenmedi.

**Tercih ve sonuç:** önceki bekleme kararı korunarak üst paketin uyumlu kararlı güncellemesi kullanıldı. Bulguyu kapatan kanıt yalnız erişim yolu yorumu değil, kilitte düzeltilmiş sürüm ve güncel audit sonucudur. GPT-6 Luna bağımsız salt okunur kilit/manifest/workspace karşılaştırmasında zinciri ve Next 16.4.6’nın korunduğunu doğruladı.

Registry’nin `typescript-estree@8.73.0` yayın zamanı **16 Kasım 17:06:48.419 UTC**, 24 saat eşiği **17 Kasım 20:06:48.419 İstanbul** idi. Paket yaşı dolduktan sonra çalışan gerçek komutlar:

```powershell
pnpm --filter @local/web update typescript-eslint '@typescript-eslint/*' --depth 10
pnpm audit --prod
pnpm audit
pnpm lint
pnpm typecheck
```

**Sonuç:** güncelleme, lint ve typecheck geçti; iki audit kalan ayrı bulgular nedeniyle exit 1 verdi. Minimatch’i engelleyen paket kalmadı. Ayrı kabul DB’sinde mevcut development Playwright senaryolarının tamamı **16/16 (37.9 sn)** geçti; atlanan yok. İki ayın gerçek kaydı/listeden yeniden açılması ve B taslağı reload sonrası kalıcıyken anonim TR/EN’de A’nın kalması, B yayımlanınca iki dilde B’nin görünmesi doğrulandı. Kaynak/test dosyalarının **69/69** hash’i, manifest ve workspace dosyası takip başlangıcıyla aynıdır; testin geçici tsconfig ekleri temizlenip typecheck yeniden geçti. Önceki production build/start kanıtı aşağıda tarihsel olarak korunur; bu takipte production build, unit ve entegrasyon testleri yeniden çalıştırılmadı.

### Picomatch: tam taramada yeni görünen ayrı bulgu

[GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf), **17 Kasım’da güncellenmiş/review edilmiş**, high seviyeli ReDoS duyurusudur; etkilenen aralık `<=4.0.7`, bildirilen düzeltilmiş sürüm **yok**. Registry `picomatch` latest sürümünü **4.0.7** olarak doğruladı. Bu takipten **önce ve sonra aynı 2.3.2 / 4.0.7 sürümleri** kilitte vardır; minimatch güncellemesi bunları getirmedi veya yükseltmedi. [Kilit paketleri](../pnpm-lock.yaml#L2320).

Tam audit 27 araç yolu bildiriyor: `eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → picomatch@2.3.2`; `eslint-import-resolver-typescript → tinyglobby → picomatch@4.0.7`, `tinyglobby → fdir → picomatch` optional peer yolu ve TS-ESTree’nin tinyglobby kolu. Üretim audit’i picomatch bildirmiyor. Ziyaretçi/admin istek verisinden glob desenine bir yol kaynakta doğrulanmadı; bu, high bulguyu kapatmaz. Sömürü deneyi çalıştırılmadı.

**Takip:** [resmî upstream sorununu](https://github.com/micromatch/picomatch/issues/194) ve güvenlik duyurusunu izle; düzeltilmiş kararlı sürüm geldiğinde ilgili üst glob/lint paketlerini uyumlu biçimde güncelle ve tam audit/lint/Playwright kontrolünü yenile. Bu dar minimatch takibinde glob paketlerini zorlayan override veya güvenlik ignore eklenmedi. High araç bulgusu deploy değerlendirmesinde ayrıca açık tutulur; mevcut bulguların tamamı kapanmış sayılmaz.

## Doğrulama ve commit ayrımı

Ayrılmış yerel PostgreSQL kabul DB’sinde mevcut Playwright senaryoları kullanılır: iki ayın kaydı/yeniden açılması, TR/EN anlık önizleme, boş/partial kayıt, yetkisiz erişim ve A yayın → B taslak → reload → anonim A → B yayın → anonim TR/EN B. Normal geliştirme, Neon ve canlı DB resetlenmez.

| Kontrol | İlk Next 16.4.6 güncellemesindeki gerçek sonuç |
| --- | --- |
| Frozen + strict peer kurulum | Geçti. |
| `pnpm lint`, `pnpm typecheck` | Geçti. |
| `pnpm test:unit` | **8/8 geçti**, atlanan yok. |
| `.\scripts\test-postgres.ps1` | **7/7 geçti**, ayrı Compose test DB’si; kabul DB’si resetlenmedi. |
| `pnpm build` | **16.4.6 ile geçti**, ayrı production build dizini. |
| `pnpm test:e2e` — development | **16/16 geçti, 1.3 dk**, atlanan yok; Next 16.4.6, Chrome, ayrı kabul DB’si. |
| `PLAYWRIGHT_PRODUCTION=1 pnpm test:e2e` — build/start | **16/16 geçti, 1.2 dk**, atlanan yok; aynı ayrı kabul DB’si, ayrı production build. |
| Netlify/Neon | Çalıştırılmadı; deploy kullanıcıya bırakıldı. |

Gerçek ortamda Node 24/pnpm 11.25 frozen kurulum, Linux SWC ve Netlify Next adapter uyumu; admin giriş/15 dk–5 başarısız deneme IP başlığı güveni, anonim liste/önizleme reddi, iki ay kaydı ve reload, A/B’nin TR/EN HTML/RSC/CDN izolasyonu ve commit sonrası yanıt kaybından toparlanma doğrulanacak. Windows yerel production kontrolü bu ortam farklarını kapatmaz. İlk halka açık yayın öncesi site genelindeki güvenlik incelemesi ayrıca açıktır.

İki ayın gerçek kaydı ve listeden yeniden açılması, TR/EN canlı şerit metni, blank/partial/legacy kayıt, yetkisiz liste erişimi ve A yayındayken kalıcı B taslağının ziyaretçiye sızmaması her iki tarayıcı modunda geçti. B yayınlandıktan sonra anonim iki dil B’yi gösterdi. Uygulama ve test kaynakları başlangıçla aynıdır; bu tur fonksiyonel test gevşetilmedi veya değiştirilmedi.

### Önerilen iki commit kapsamı

| Commit mesajı | Dosyalar / parça kapsamı |
| --- | --- |
| `feat(admin): yönetim menüsü ve görsel taslak editörü ekle` | Mevcut `apps/web/src/app/admin/**` değişiklikleri; yeni koleksiyon `apps/web/src/app/api/admin/ayin-kitabi/route.ts`; `src/server/monthly-read/{contracts,repository,service}.ts` değişiklikleri; `e2e/admin-editor.spec.ts`, `e2e/admin.spec.ts`, `e2e/publication.spec.ts`, `test/unit/contracts.test.ts`, `test/integration/storage.test.ts`; paylaşılabilir `docs/ADMIN_GUIDE.md`, `docs/ADMIN_FIRST_DELIVERY.md` ve README’nin admin/kurulum açıklamaları. Kılavuzun kabul özeti kendi içinde, bağlantıları bu commit veya önceki izlenen dosyalardadır. |
| `fix(deps): Next.js ve minimatch güvenlik güncellemelerini uygula` | Tam dosyalar: **`apps/web/package.json`, `pnpm-lock.yaml`, `docs/DEPENDENCY_SECURITY_2026-11-17.md`**. Ayrıca README’nin yalnız bağımlılık güncellemesi ve güvenlik kontrolü paragrafları. Next 16.4.6 ve TypeScript-ESLint/minimatch güncellemesi birlikte açıklanır; uygulama/test kodu bu commit’e karıştırılmaz. |

17 Kasım commit hazırlığında kullanıcı ilk kapsamı stage etmeyi yetkilendirdi; commit, push ve deploy kullanıcıya aittir. README index’te paragraflara ayrılır: admin/kurulum ve durum açıklamaları ilk commit’e, bağımlılık sürümü ve güvenlik kontrolü paragrafları ikinciye aittir. İlk commit sonrası ikinci kapsamın tam dosya listesi `README.md`, `apps/web/package.json`, `pnpm-lock.yaml`, `docs/DEPENDENCY_SECURITY_2026-11-17.md` olur. Yerel `SESSION_NOTES`/işletim ve diğer kişisel notlar, yerel planlar ve kabul listesi bu iki commit’e topluca eklenmez; paylaşılabilir sonuçlar admin kılavuzu ve bu raporda tutulur. `.env` dosyaları/değerleri, test çıktıları/ignored scratch, paylaşım PDF’si ve `package-lock.json` kapsam dışıdır. `pnpm-workspace.yaml` veya kalıcı güvenlik istisnası eklenmedi. Bu tur migration yok; önceki admin/yayın migration’ları mevcut commit geçmişindedir.

**Hazırlık sonucu:** ilk kapsamda 30 dosya stage edildi; `git diff --cached --stat` 690 ekleme / 115 silme, `git diff --cached --check` exit 0. README’nin çalışma kopyası korundu; index’te admin/kurulum, stage dışında yalnız iki bağımlılık/güvenlik paragrafı var. İlk commit ağacındaki 54 yerel Markdown bağlantısı ve ikinci kapsam eklenince oluşacak ağaçtaki 63 bağlantı Git index’i üzerinden doğrulandı; yalnız yerelde bulunan kişisel dosyalar hedef kabul edilmedi. Yeni eklenen içerikte kişisel adres/sır göstergesi bulunmadı. Bu tur test, paket güncelleme, commit, push veya deploy çalıştırılmadı.
