# Docker ile yerel PostgreSQL testleri

Docker Desktop açıkken ve proje paketleri kurulu olduğunda, repo kökünden PowerShell ile çalıştırın:

```powershell
.\scripts\test-postgres.ps1
```

Komut PostgreSQL 18 test servisini `127.0.0.1:55432` üzerinde açar, hazır olmasını bekler ve mevcut `pnpm test:integration` paketini çalıştırır. Testler migration'ları kendileri uygular. Servis açılmazsa veya testler başarısızsa komut hata verir.

Testler tabloları sıfırlayabilir. Yardımcı komut `TEST_DATABASE_URL` ve `ALLOW_TEST_DATABASE_RESET` değerlerini sadece çalışırken, bu Compose servisine ait veritabanı için ayarlar. `.env.local`, uygulamanın `DATABASE_URL` değeri, Neon ve gerçek admin hesabı bu akışın dışında kalır. Compose'taki kullanıcı ve parola sadece yerel test içindir. Aynı test veritabanında eşzamanlı iki test çalıştırmayın.

Test sonunda servis yeniden kullanım için açık kalır. Durumu görmek veya yalnız bu servisi durdurmak için:

```powershell
docker compose -p localkitapkulubu-test ps postgres
docker compose -p localkitapkulubu-test stop postgres
```

Bu komutlar test verilerini silmez. Next.js hâlâ `pnpm dev` ile çalışır; bu kurulum admin Playwright testleri için gereken ayrı kabul veritabanını oluşturmaz.

16 Kasım yayın kabulü entegrasyon DB'sinden ayrı bir yerel kabul DB'sinde çalıştırıldı. Test hesabı hazırlığı, gerekli ortam değişkenleri, fixture dönemleri ve production test yolu [yayın teslimi kılavuzunda](MONTHLY_READ_PUBLISHING_DELIVERY.md#kullanım-ve-tekrar-çalıştırma) kayıtlıdır. Entegrasyon reset komutunu uygulamanın/kabul sunucusunun DB'sine yönlendirmeyin.
