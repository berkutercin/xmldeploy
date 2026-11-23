; Kurulum karşılama ekranı: sol kenarda build/installerSidebar.bmp görünür.
!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "ZarfPDF kurulumuna hoş geldiniz"
  !define MUI_WELCOMEPAGE_TEXT "ZarfPDF, GİB zarf XML'lerini faturanın kendi görüntüleme şablonuyla A4 PDF'e çevirir ve faturanın GİB'deki durumunu sorgular.$\r$\n$\r$\nDosyalarınız bilgisayarınızda işlenir; hiçbir sunucuya yüklenmez.$\r$\n$\r$\nDevam etmek için İleri'ye basın."
  !insertmacro MUI_PAGE_WELCOME
!macroend
