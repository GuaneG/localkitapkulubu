# Okuma numarası uygulama planı

19 Kasım güncel işletim durumu [teslim kaydındadır](../../READING_NUMBER_DELIVERY.md#19-kasım--neon-deneme-veritabanı-migration-kabulü). Aşağıdaki kapsam ve kısıtlar 17 Kasım uygulama turuna aittir.

> For agentic workers: Mevcut akışta küçük adımlar ve test kanıtı; kullanıcı uygulamayı yetkilendirdi. Commit/push/deploy/Neon migration yok.

**Goal:** PO’nun girdiği isteğe bağlı ortak okuma numarasını taslak ve yayın kopyasında tutup şerit başlığında iki dilde göstermek.

**Architecture:** Nullable `reading_number` hem taslakta hem değişmez revision’da saklanır. Yetki, satır kilidi, expectedVersion, receipt kimliği ve public snapshot okuma yolu korunur. Editör ortak AdminField kullanır; sunum tek MonthlyReadBand içindedir.

**Tech Stack:** Mevcut Next 16.4.6, React, Drizzle/PostgreSQL ve Playwright; yeni paket yok.

## Kesin kapsam ve teknik tercihler — 17 Kasım 2026

Kullanıcı ortak tek alan, elle 38 girişi, iki dilde `Read of the month #38`, taslak/yayın ayrımı ve 38→39 testini istedi. Otomatik numara artışı, gerçek DB’ye 38 backfill ve Neon migration yok. Eski kayıtlarda NULL numarasız görünüm verir.

Teknik tercih: PostgreSQL integer ile 1..2147483647; UI ve sunucuda aynı sınır. Boş/null numarasızdır, API’de alanı göndermeyen eski istemci mevcut numarayı korur (yeni kayıtta NULL); açık null alanı temizler. Yalnız geçerli numara da kısmi taslak sayılır; yayın için mevcut TR/EN metin zorunlulukları değişmez. Bu tercihler ürün akışını mevcut partial kayıt kuralına uyarlar.

- [x] Luna: ortak doğrulama/DTO, schema ve Drizzle 0002 SQL/journal/snapshot; repository save/read/publish ve public DTO; unit/entegrasyon GREEN. Uygulama öncesi backend RED doğrulanamadı; sınır teslim kaydında.
- [x] Ana agent: mevcut yayın Playwright testine 38/39 ve invalid kontrolleri; eksik UI alanında RED → ortak alan ve MonthlyReadBand sonrası GREEN.
- [x] Ayrı yerel DB’ye migration; admin/yayın regresyonu, lint/typecheck/unit/entegrasyon/build ve tarayıcı görüntüsü.
- [x] Native Astra kota nedeniyle sonuç üretemedi; uzman yönergeleri elle aktarılmış GPT-6.2 Astra odaklı salt okunur inceleme yaptı. Omitted numara/boş metin uyumluluk bulgusu düzeltildi, test edildi ve yeniden incelemede kapandı.
- [x] Kılavuz, karar ve kabul kayıtları güncellendi; hedefte 0002 migration ve canlı kabul açık. [Gerçek komutlar ve sınırlar](../../READING_NUMBER_DELIVERY.md).
