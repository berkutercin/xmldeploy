import { ArrowRight, Download } from 'lucide-react';
import shotLight from './assets/app-light.png';
import shotDark from './assets/app-dark.png';
import pdf1 from './assets/pdf-1.png';
import pdf2 from './assets/pdf-2.png';

/**
 * Tanıtım sayfası: ana görsel dönüşümün kendisidir. Soldaki zarfın içindeki iki fatura,
 * sağda uygulamanın bu dosyadan ürettiği iki gerçek PDF sayfası olarak çıkar.
 * Örnek dosya: tests/fixtures/zarf_ornek.xml (uydurma veri).
 */

// Yeni sürümde VERSION ve dosya adı birlikte güncellenir.
const VERSION = '1.1.0';
const DOWNLOAD = `https://github.com/berkutercin/xmldeploy/releases/download/v${VERSION}/ZarfPDF.Setup.${VERSION}.exe`;
const REPO = 'https://github.com/berkutercin/xmldeploy';

// Örnek zarfın kısaltılmış hali; vurgulu satırlar sağdaki PDF'lere dönüşen belgeler.
const XML: [string, boolean?][] = [
  ['<sh:StandardBusinessDocument>'],
  ['  <!-- gönderen, alıcı, zarf numarası -->'],
  ['  <ef:Package>'],
  ['    <Elements>'],
  ['      <ElementType>INVOICE</ElementType>'],
  ['      <ElementCount>2</ElementCount>'],
  ['      <ElementList>'],
  ['        <Invoice>'],
  ['          <cbc:ID>ABC2026000000001</cbc:ID>', true],
  ['          …'],
  ['        </Invoice>'],
  ['        <Invoice>'],
  ['          <cbc:ID>ABC2026000000002</cbc:ID>', true],
  ['          …'],
  ['        </Invoice>'],
  ['      </ElementList>'],
  ['    </Elements>'],
  ['  </ef:Package>'],
  ['</sh:StandardBusinessDocument>'],
];

const LISTS: [string, string[]][] = [
  ['Açtığı dosyalar', [
    'e-Fatura, e-Arşiv ve e-İrsaliye XML’leri',
    'İçinde birden çok belge olan GİB zarfları',
    'Klasör ya da ZIP; yüzlerce dosya bir arada',
  ]],
  ['Verdiği çıktılar', [
    'Her belge için A4 PDF; faturada firma şablonu varsa onunla, yoksa standart düzende',
    'Toplu indirmede tek ZIP',
    'Belgenin GİB’deki durumu: geçerli, iptal, reddedildi',
  ]],
];

export default function Site() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-rule">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-4 md:px-10">
          <span className="token font-medium text-ink">ZarfPDF</span>
          <a href={DOWNLOAD} className="btn h-9">İndir</a>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-4 md:px-10">
        <section className="pb-20 pt-14 lg:pt-20">
          <h1 className="text-[44px] font-medium leading-[1.02] tracking-[-0.025em] md:text-[64px]">
            Zarf girer, PDF çıkar.
          </h1>
          <p className="mt-5 max-w-[36rem] text-[17px] leading-relaxed text-ink-2">
            GİB zarfının içindeki her faturayı ayrı bir A4 PDF’e çeviren Windows uygulaması. Dosyalar bilgisayarınızda kalır.
          </p>

          <div className="mt-12 grid gap-4 lg:grid-cols-[minmax(0,1fr)_2.5rem_minmax(0,1.1fr)] lg:gap-6">
            <figure className="min-w-0 border border-rule bg-paper-3">
              <figcaption className="border-b border-rule px-4 py-3 text-[13px] text-muted">zarf_ornek.xml</figcaption>
              <pre className="overflow-x-auto p-4 font-mono text-[12px] leading-[1.75]">
                {XML.map(([line, hit], i) => (
                  <div key={i} className={hit ? 'font-medium text-ink' : 'text-muted'}>{line}</div>
                ))}
              </pre>
            </figure>

            <div className="flex items-center justify-center text-muted" aria-hidden="true">
              <ArrowRight size={20} strokeWidth={1.5} className="rotate-90 lg:rotate-0" />
            </div>

            <figure className="grid min-w-0 grid-cols-2 content-start gap-4">
              {[
                [pdf1, 'ABC2026000000001'],
                [pdf2, 'ABC2026000000002'],
              ].map(([src, no]) => (
                <div key={no}>
                  <img src={src} alt={`${no} numaralı faturanın PDF’i`} className="block w-full border border-rule" width={337} height={477} />
                  <div className="mt-2 font-mono text-[12px] text-ink-2">{no}.pdf</div>
                </div>
              ))}
            </figure>
          </div>

          <div className="mt-14 flex flex-wrap items-center gap-x-5 gap-y-3">
            <a href={DOWNLOAD} className="btn-primary h-11 px-5">
              <Download size={14} strokeWidth={1.5} /> Windows için indir
            </a>
            <span className="text-[14px] text-muted">Sürüm {VERSION} · Windows 10 ve 11 · 117 MB</span>
          </div>
          <p className="mt-3 max-w-[36rem] text-[14px] text-muted">
            Kurulum dosyası imzasız. Windows uyarı gösterirse “Ek bilgi”, ardından “Yine de çalıştır”a basın.
          </p>
        </section>

        <section className="grid gap-x-10 border-t border-ink md:grid-cols-2">
          {LISTS.map(([title, items], i) => (
            <div key={title} className={`pb-6 pt-8 ${i ? 'border-t border-rule md:border-t-0' : ''}`}>
              <h2 className="text-[20px] font-medium">{title}</h2>
              <ul className="mt-3">
                {items.map((t) => (
                  <li key={t} className="border-b border-rule py-3 text-[16px] text-ink-2 last:border-b-0">{t}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section className="pb-20 pt-12">
          <figure>
            <picture>
              <source srcSet={shotDark} media="(prefers-color-scheme: dark)" />
              <img
                src={shotLight}
                alt="ZarfPDF: solda fatura listesi, sağda seçili faturanın PDF önizlemesi"
                className="block w-full border border-rule"
                width={1248}
                height={821}
                loading="lazy"
              />
            </picture>
            <figcaption className="mt-4 max-w-[40rem] text-[14px] text-muted">
              Solda faturalar, sağda seçili faturanın PDF’i. Satırdaki “GİB’e sor” belgenin GİB’deki durumunu getirir; bu sorgu dışında internete hiçbir şey gitmez.
            </figcaption>
          </figure>
        </section>
      </main>

      <footer className="border-t border-rule">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-2 px-4 py-6 text-[13px] text-muted md:px-10">
          <span>ZarfPDF {VERSION}</span>
          <a href={REPO} className="underline-offset-4 hover:text-ink hover:underline">Kaynak kodu GitHub’da</a>
        </div>
      </footer>
    </div>
  );
}
