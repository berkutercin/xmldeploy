import { ArrowRight, Download } from 'lucide-react';
import shotLight from './assets/app-light.png';
import shotDark from './assets/app-dark.png';

/**
 * Tanıtım sayfası: ana görsel dönüşümün kendisidir. Solda zarf XML'i girer, sağda PDF'ler
 * ve GİB mührü çıkar; uygulamanın ekranı en sonda kanıt olarak durur.
 */

// Yeni sürümde VERSION, META ve dosya adı birlikte güncellenir.
const VERSION = '1.1.0';
const DOWNLOAD = `https://github.com/berkutercin/xmldeploy/releases/download/v${VERSION}/ZarfPDF.Setup.${VERSION}.exe`;
const META = `${VERSION} · Windows 10 ve 11 · 117 MB`;

const XML = `<sh:StandardBusinessDocument>
  <ef:Package>
    <Invoice>
      <cbc:ID>ABC2026000000001</cbc:ID>
      <cac:AdditionalDocumentReference>
        … firma.xslt (base64)
    </Invoice>
    <Invoice>
      <cbc:ID>ABC2026000000002</cbc:ID>
    </Invoice>`;

const IO: [string, string[]][] = [
  ['Verebilecekleriniz', ['Tek XML ya da birden çok XML', 'Klasör', 'ZIP', 'İçinde birden çok fatura olan GİB zarfı']],
  ['Alacaklarınız', ['Tek PDF', "PDF'lerden oluşan ZIP", "Zarftan ayıklanmış saf XML'ler", 'GİB durum sonucu']],
];

function Marks() {
  return (
    <>
      <span className="plate-mark -left-2 -top-2" />
      <span className="plate-mark -right-2 -top-2" />
      <span className="plate-mark -bottom-2 -left-2" />
      <span className="plate-mark -bottom-2 -right-2" />
    </>
  );
}

/** Uygulamadaki GİB mührünün aynısı; burada örnek sonuç gösterir. */
function Stamp({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label="Örnek GİB sonucu: geçerli" className="stamp-in text-seal-ink">
      <defs>
        <path id="stamp-ring" d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0" />
      </defs>
      <circle cx="60" cy="60" r="58" className="fill-seal" />
      <circle cx="60" cy="60" r="34" fill="none" stroke="currentColor" strokeWidth="0.75" opacity="0.5" />
      <text className="fill-seal-ink" style={{ font: '500 8.2px var(--font-mono)', letterSpacing: '0.14em' }}>
        <textPath href="#stamp-ring" textLength="272">GİB SORGUSU · KAYIT BULUNDU · </textPath>
      </text>
      <text x="60" y="64" textAnchor="middle" className="fill-seal-ink" style={{ font: '600 12px var(--font-body)', letterSpacing: '0.04em' }}>
        GEÇERLİ
      </text>
    </svg>
  );
}

/** Çıktı tarafındaki küçük PDF: gerçek faturanın kâğıdı gibi her temada beyaz. */
function MiniPdf({ no, amount }: { no: string; amount: string }) {
  return (
    <div className="aspect-[210/297] w-full border border-rule bg-white p-3 text-[#16181a]" aria-label={`${no} PDF`}>
      <div className="text-[9px] font-semibold tracking-wide text-[#a8322b]">FATURA</div>
      <div className="mt-1 font-mono text-[7px]">{no}</div>
      <div className="mt-3 grid grid-cols-2 gap-1">
        <div className="h-6 border border-[#ddd]" />
        <div className="h-6 border border-[#ddd]" />
      </div>
      <div className="mt-3 space-y-1">
        {[80, 64, 72].map((w) => <div key={w} className="h-[3px] bg-[#e6e6e6]" style={{ width: `${w}%` }} />)}
      </div>
      <div className="ml-auto mt-3 w-1/2 border-t border-[#16181a] pt-1 text-right font-mono text-[7px]">{amount} TRY</div>
    </div>
  );
}

export default function Site() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-rule">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-4 md:px-10">
          <span className="token font-medium text-ink">ZarfPDF</span>
          <span className="token hidden text-muted sm:inline">{META}</span>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-4 md:px-10">
        <section className="py-14 lg:py-20">
          <h1 className="max-w-[18ch] text-[40px] font-medium leading-[1.05] tracking-[-0.02em] md:text-[56px]">
            Zarf girer. PDF ve GİB sonucu çıkar.
          </h1>

          <div className="mt-12 grid items-stretch gap-6 lg:grid-cols-[1.1fr_auto_1fr]">
            <figure className="flex flex-col border border-rule bg-paper-3">
              <figcaption className="token border-b border-rule px-4 py-3 text-muted">Girdi · zarf_ornek.xml</figcaption>
              <pre className="flex-1 overflow-x-auto p-4 font-mono text-[12px] leading-[1.7] text-ink-2">{XML}</pre>
            </figure>

            <div className="flex items-center justify-center gap-3 py-2 lg:flex-col" aria-hidden="true">
              <span className="token text-muted">ZarfPDF</span>
              <ArrowRight size={20} strokeWidth={1.5} className="rotate-90 lg:rotate-0" />
            </div>

            <figure className="relative flex flex-col border border-rule bg-paper-3">
              <figcaption className="token border-b border-rule px-4 py-3 text-muted">Çıktı · 2 PDF</figcaption>
              <div className="grid flex-1 grid-cols-2 gap-4 p-4 pb-14">
                <MiniPdf no="ABC2026000000001" amount="1.200,00" />
                <MiniPdf no="ABC2026000000002" amount="2.500,50" />
              </div>
              <div className="absolute -bottom-10 right-6 -rotate-[8deg]">
                <Stamp size={104} />
              </div>
            </figure>
          </div>

          <div className="mt-16 flex flex-wrap items-center gap-x-4 gap-y-3">
            <a href={DOWNLOAD} className="btn-primary h-11 px-5">
              <Download size={14} strokeWidth={1.5} /> Windows için indir
            </a>
            <span className="text-[14px] text-muted">Kurulum imzasız; Windows uyarı verirse “Ek bilgi → Yine de çalıştır”.</span>
          </div>
        </section>

        <section className="grid border-t border-ink md:grid-cols-2" aria-label="Girdi ve çıktı">
          {IO.map(([title, items], i) => (
            <div key={title} className={`py-8 ${i ? 'border-t border-rule md:border-l md:border-t-0 md:pl-10' : 'md:pr-10'}`}>
              <h2 className="token text-muted">{title}</h2>
              <ul className="mt-4">
                {items.map((t) => (
                  <li key={t} className="border-b border-rule py-3 text-[17px]">{t}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section className="py-16">
          <div className="plate p-3">
            <Marks />
            <picture>
              <source srcSet={shotDark} media="(prefers-color-scheme: dark)" />
              <img
                src={shotLight}
                alt="ZarfPDF: solda fatura listesi, sağda seçili faturanın PDF önizlemesi"
                className="block w-full border border-rule"
                loading="lazy"
              />
            </picture>
          </div>
          <p className="mt-4 text-[14px] text-muted">Her şey bilgisayarınızda işlenir. GİB sorgusu Türkiye IP'sinden çalışır.</p>
        </section>
      </main>

      <footer className="border-t border-rule">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-2 px-4 py-6 text-[13px] text-muted md:px-10">
          <span>ZarfPDF {META}</span>
          <span>Dosyalarınız bilgisayarınızda işlenir. Dışarı giden tek istek GİB sorgusudur.</span>
        </div>
      </footer>
    </div>
  );
}
