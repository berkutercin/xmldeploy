# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

(Electron masaüstü kabuğu içinde çalışan bir web arayüzü; tasarım dili web'dir.)

## Users

İki kitle birlikte:
- Muhasebe çalışanları: gün içinde sık kullanır; entegratörden veya e-postadan gelen zarf/XML yığınlarını PDF yapıp arşivler, GİB'de durum doğrular.
- Teknik olmayan, arada bir gelen kişiler: zarf XML'in ne olduğunu bilmez; elindeki bir faturayı açıp PDF almak ister.

## Product Purpose

GİB Zarf XML (`StandardBusinessDocument` / `Package`) ve doğrudan UBL-TR XML'lerini (e-Fatura, e-Arşiv, e-İrsaliye) A4 PDF'e dönüştürür; tekli ya da toplu (ZIP). Belgenin GİB'deki durumunu (geçerli, iptal, reddedildi vb.) resmi sorgu servisinden sorgular. Başarı: kullanıcı dosyayı bırakır, ne çıkacağını hemen görür ve PDF'ini ya da GİB durumunu alır.

## Positioning

GİB'in resmi görüntüleyicisinin açamadığı zarf XML'lerini açar: zarfın içindeki faturaları ayıklar, gömülü firma XSLT'siyle orijinal görünümde PDF üretir. Her şey kullanıcının bilgisayarında işlenir; dışarı giden istekler yalnızca GİB sorgusu ve açılıştaki sürüm denetimidir (GitHub).

## Operating Context

- Electron masaüstü uygulaması (önce Windows; ileride macOS ve Linux).
- Girdi: tek XML, çok sayıda XML, klasör veya ZIP. Bir zarf birden fazla belge içerebilir.
- Çıktı: tek PDF, PDF'lerden oluşan ZIP, zarftan ayıklanmış saf XML'ler, GİB durum sonucu.
- GİB sorgusu yalnızca Türkiye IP'sinden çalışır.

## Capabilities and Constraints

- İki ana iş, iki ayrı sekme: PDF Dönüştür ve GİB Doğrula (kullanıcı ayrı kalmasını istedi).
- Yüklenen belgeler satır satır tablo hâlinde listelenir (korunacak).
- Açık ve koyu tema, tema düğmesiyle (korunacak).
- Önizleme, tekli PDF indirme, toplu ZIP, iptal edilebilir toplu ilerleme, toplu GİB sorgusu, satırdan GİB formuna aktarma.
- Gömülü XSLT yoksa standart A4 şablonuna düşer.

## Brand Commitments

- Ad: ZarfPDF. Dil: Türkçe.
- Arayüz yaptığı işi doğrudan göstermeli: girdi → çıktı (XML/zarf girer, PDF/sonuç çıkar). Süs yerine dönüşümün kendisi görünür olmalı.
- Sade ve basit; ama sıradan değil, kendine ait bir düşüncesi olmalı.

## Evidence on Hand

- Gerçek test XML'leri `tests/` altındaki testlerde kullanılıyor (`tests/realFiles.test.ts`, `tests/mikro.test.ts`).
- Müşteri, kullanım sayısı veya referans yok; uydurulmamalı.

## Product Principles

1. Girdi ve çıktı her an görünür: kullanıcı neyi verdiğini ve ne alacağını aynı bakışta görür.
2. Sık kullanan için hız, ilk kez gelen için açıklık; ikisi aynı ekranda.
3. Gizlilik bir özellik değil varsayılan: belgeler bilgisayardan çıkmaz.
4. Az ama doğru: her öğe bir işi taşır.
