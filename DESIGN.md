---
name: ZarfPDF
description: XML'i bırak, PDF'i al. Girdi solda numaralı satırlar, çıktı sağda canlı baskı levhası.
colors:
  paper: "#f5f4f6"
  paper-warm: "#faf6f5"
  paper-cool: "#eef3ef"
  paper-selected: "#ebeaf3"
  plate: "#fdfcfd"
  ink: "#16181a"
  ink-soft: "#3a3c40"
  muted: "#66645f"
  rule: "#c9c7c4"
  seal: "#dcddf3"
  seal-ink: "#2e3170"
  focus: "#4b4fa8"
  error: "#a8322b"
  success: "#2f6b45"
  dark-paper: "#141517"
  dark-paper-selected: "#1d1e21"
  dark-plate: "#1a1b1e"
  dark-ink: "#ecebee"
  dark-muted: "#9b99a0"
  dark-rule: "#36383c"
  dark-seal: "#3b3d63"
  dark-seal-ink: "#dcddf3"
typography:
  body:
    fontFamily: "Instrument Sans, Segoe UI, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  token:
    fontFamily: "DM Mono, ui-monospace, monospace"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: "0.14em"
  list:
    fontFamily: "Allo, Segoe UI, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.4
  data:
    fontFamily: "DM Mono, ui-monospace, monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  none: "0px"
spacing:
  gutter: "40px"
  row: "12px"
  plate-pad: "12px"
  plate-gutter: "76px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.token}"
    rounded: "{rounded.none}"
    height: "40px"
    padding: "0 16px"
  button:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.token}"
    rounded: "{rounded.none}"
    height: "40px"
    padding: "0 16px"
  input:
    backgroundColor: "{colors.plate}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    height: "44px"
    padding: "0 12px"
  plate:
    backgroundColor: "{colors.plate}"
    rounded: "{rounded.none}"
    padding: "12px 12px 76px"
---

# Design System: ZarfPDF

## Overview

**Baskı Provası.** Uygulama bir matbaa prova masasıdır: solda verilen dosyalar numaralı satırlar halinde dizilir, sağda seçili belgenin gerçek A4 PDF'i köşelerinde kayıt artıları olan bir levhada durur. Ne yaptığını başlık söyler ("XML'i bırak, PDF'i al." → "4 dosyadan 5 PDF"); arayüz bu girdi → çıktı ilişkisini göstermek dışında bir şey yapmaz.

GİB sonucu levhanın sol alt köşesine, yarısı levhadan taşan yuvarlak bir mühür olarak basılır. Halka metni kaynağı ve tarihi, ortası durumu söyler. Bu dünyanın tek süsü mühürdür; geri kalan her şey kâğıt, mürekkep ve ince çizgidir.

Mod: Operate. Muhasebeci her gün kullanır; tarama hızı ve tutarlılık ifadeden önce gelir.

## Colors

### Primary
- **Mürekkep** (`ink` #16181a / koyu #ecebee): metin, birincil düğme zemini, kayıt artıları. Saf siyah değil.

### Secondary
- **Mühür** (`seal` #dcddf3, `seal-ink` #2e3170 / koyu #3b3d63, #dcddf3): yalnızca GİB'in kaydı doğruladığı durumlarda ve seçili satır tonunda (`paper-selected` #ebeaf3). Başka hiçbir yerde lavanta kullanılmaz.

### Neutral
- **Kâğıt** (`paper` #f5f4f6): sayfa zemini; sıcak (#faf6f5) ve serin (#eef3ef) köşe kaymasıyla gövdeye yayılır.
- **Levha** (`plate` #fdfcfd): baskı alanı ve girdiler.
- **Çizgi** (`rule` #c9c7c4): tüm ayırıcılar 1px hairline.
- **Soluk** (`muted` #66645f): etiketler, ikincil metin.

### Named Rules
- **Mühür kuralı.** Dolgu durumu kodlar, renk tek başına değil: Geçerli/İptal/Reddedildi lavanta dolu; Bulunamadı boş kâğıt disk; Hata kesik çizgili. Satır içi nokta aynı kuralı izler.

## Typography

Sayfa sesi: Instrument Sans 400 (500/600 yalnız vurguda). Belge listesi Allo ile yazılır (`.list-face`; listedeki etiket ve rakamlar da Allo). Etiketler DM Mono 11px, büyük harf, 0.14em aralık. Belge numarası, tutar, VKN gibi veriler mono 13px, tabular rakam.

### Hierarchy
- Büyük başlık ve açıklama metni yok: ekran doğrudan eylem satırıyla açılır.
- **Body** 15px; **ikincil** 13px soluk.
- **Token** 11px mono caps: sekmeler, sütun başlıkları, düğme etiketleri, sayım.

### Named Rules
- **Token kırpma kuralı.** Token satır yüksekliği 1.25'in altına inmez; Ü/İ noktaları `truncate` ile kesilmesin. Kişi/firma adları token ile değil gövde metniyle yazılır.

## Layout

12 sütun; `lg` 8/4, `xl` 7/5. Boşken: ortada en çok 760px genişlikte, noktalı ve kayıt artılı bir bırakma levhası (ikon, 26px başlık, tek cümle, Dosya seç / Klasör seç), altında Ctrl+O ve Ctrl+V kısayolları. Doluyken sol: eylem satırı → fiş listesi. Sağ: yapışkan levha; genişliği `max(360px, (100vh - 300px) × 0.707)` ile sınırlı ki levha + başlık + ikonlar 900px ekrana sığsın. Pencere en az 1080px.

Üst çubuk 56px: marka, iki sekme, sağda sayım ("4 dosya · 5 belge"), tema düğmesi.

## Elevation & Depth

Gölge yok. Derinlik yalnızca levha zemininin kâğıttan bir ton açık olması ve mührün levhanın kenarından taşmasıyla verilir.

## Shapes

Köşe yarıçapı her yerde 0. Tek daire mühür ve durum noktasıdır.

## Components

### Buttons
- **Birincil**: mürekkep zemin, kâğıt metin, token tipografi, 40px. Ekranda bir tane.
- **İkincil**: 1px mürekkep çerçeve, saydam.
- **Sessiz**: soluk token metin, hover'da altı çizili.
- **İkon**: 32px kare, soluk; lucide, 1.5 çizgi.

### Inputs / Fields
Levha zemin, 1px çizgi, 44px; üstünde token etiket. Odakta çerçeve mürekkebe döner.

### Navigation
Token sekmeler; etkin olan 1px mürekkep alt çizgi ve `aria-current`.

### Invoice list (Fiş)
Her fatura tek bir fiş (`InvoiceList`), aralarında 8px boşluk, `plate` tonunda; seçili fiş 1px mürekkep çerçeve ve `paper-selected`. Sütunlar: seçim kutusu | numara + soluk dosya adı (zarfsa `· 1/2`), altında Satıcı/Alıcı etiketli iki satır | 20px tutar, altında para birimi · tür · tarih | çizgiyle ayrılmış GİB sonucu ve işlemler. Üstte tümünü seç, sayaç, Seçimi kaldır, Ekle, Temizle. Shift ile aralık seçilir; seçim varken toplu düğmeler yalnız seçililere uygulanır.

### Plate (Levha)
`plate` zemin, 1px çizgi, dört köşede 16px kayıt artısı. İçinde gerçek PDF (iframe, A4 ölçekli, kaydırma çubuksuz). Altta 76px boşluk mührün iniş yeri; altında numara, satıcı, ikon satırı (`pl-24 xl:pl-32`).

### Seal (Mühür)
SVG; dış halkada textPath "GİB SORGUSU · tarih · KOD x", ortada durum. -8° dönük, 600ms `stamp-in` ile basılır. Dönüştür levhasında genişlik `clamp(96px, 24%, 132px)`, merkezi levhanın alt kenarında; GİB levhasında 148px.

## Do's and Don'ts

### Do:
- Girdi → çıktı ayrımını koru: solda numaralı satırlar, sağda canlı levha.
- Durumu dolgu/çizgi biçimiyle de kodla.
- Türkçe metni `lang="tr"` ve `toLocaleUpperCase('tr-TR')` ile büyüt.

### Don't:
- Başlık üstüne mono "kicker" koyma; tür bilgisi satır olarak gider.
- Yuvarlak köşe, gölge, gradyan metin, ikinci bir vurgu rengi ekleme.
- Mührü belge verisinin üstüne bindirme.
- Firma adlarını `truncate` ile kesme; sar.
