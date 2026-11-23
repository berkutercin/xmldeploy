import { ArrowRight, Download } from 'lucide-react';
import shotLight from './assets/app-light.png';
import shotDark from './assets/app-dark.png';
import pdfGib from './assets/pdf-gib.png';

/**
 * Tanıtım sayfası: ana görsel dönüşümün kendisidir. Solda tek faturalık bir zarf XML'i,
 * sağda uygulamanın bu dosyadan, içine gömülü GİB general.xslt şablonuyla ürettiği PDF.
 * Örnek dosya: tests/fixtures/02041409a-aa25-08a6-b926-56acbd65cdc7.xml (GİB'in uydurma örnek faturası).
 */

// Yeni sürümde bu blok birlikte güncellenir (SHA-256: release/ içindeki kurulum dosyasının özeti).
const RELEASE = {
  version: '1.2.0',
  date: '23 Kasım 2026',
  size: '117 MB',
  sha256: '09ed21df4858e3d7802d39c57121ffa31a490739eafdbe736b492e044e67060a',
};
const REPO = 'https://github.com/berkutercin/xmldeploy';
const DOWNLOAD = `${REPO}/releases/download/v${RELEASE.version}/ZarfPDF-Setup-${RELEASE.version}.exe`;
const NOTES = `${REPO}/releases/tag/v${RELEASE.version}`;

const ZARF = '02041409a-aa25-08a6-b926-56acbd65cdc7.xml';
const PDF_NAME = 'ABC2026000000001_AAA Anonim Şirketi.pdf';

// Örnek zarfın kısaltılmış hali; vurgulu satırlar PDF'e dönüşen faturayı ve onu basan şablonu gösterir.
const XML: [string, boolean?][] = [
  ['<sh:StandardBusinessDocument>'],
  ['  <!-- gönderen, alıcı, zarf numarası -->'],
  ['  <ef:Package>'],
  ['    <Elements>'],
  ['      <ElementType>INVOICE</ElementType>'],
  ['      <ElementCount>1</ElementCount>'],
  ['      <ElementList>'],
  ['        <Invoice>'],
  ['          <cbc:ProfileID>TICARIFATURA</cbc:ProfileID>'],
  ['          <cbc:ID>ABC2026000000001</cbc:ID>', true],
  ['          <cbc:IssueDate>2026-10-19</cbc:IssueDate>'],
  ['          <cac:AdditionalDocumentReference>'],
  ['            <cbc:DocumentType>XSLT</cbc:DocumentType>', true],
  ['            <cbc:EmbeddedDocumentBinaryObject', true],
  ['              filename="general.xslt">PD94bWwg…', true],
  ['          </cac:AdditionalDocumentReference>'],
  ['          …'],
  ['        </Invoice>'],
  ['      </ElementList>'],
  ['    </Elements>'],
  ['  </ef:Package>'],
  ['</sh:StandardBusinessDocument>'],
];

const FEATURES: [string, string][] = [
  ['Toplu dönüştürme', 'Zarf XML’lerini tek tek, klasör ya da ZIP olarak bırakın. Her zarf ayrı bir PDF olur; hepsini tek ZIP olarak indirirsiniz. e-Fatura, e-Arşiv ve e-İrsaliye XML’leri de açılır.'],
  ['Orijinal görünüm', 'PDF, zarfın içindeki XSLT görüntüleme şablonuyla basılır; fatura, satıcının gönderdiği gibi görünür. Şablon yoksa standart A4 düzeni kullanılır.'],
  ['GİB doğrulaması', 'Faturanın GİB kayıtlarındaki durumunu sorgular: geçerli, iptal edilmiş, reddedilmiş ya da kaydı bulunamadı.'],
  ['Bilgisayarınızda çalışır', 'Dosyalar hiçbir sunucuya yüklenmez. İnternete yalnızca GİB sorgusu ve açılıştaki sürüm denetimi gider.'],
  ['Kendini günceller', 'Yeni sürüm arka planda iner; tek tıkla yeniden başlatın ya da uygulamayı kapattığınızda kurulsun.'],
];

const SPECS: [string, string][] = [
  ['Sürüm', `${RELEASE.version} · ${RELEASE.date}`],
  ['Sistem', 'Windows 10 ve 11, 64 bit'],
  ['Boyut', RELEASE.size],
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
          <p className="mt-5 max-w-[38rem] text-[17px] leading-relaxed text-ink-2">
            GİB zarf XML’lerini, faturanın kendi görüntüleme şablonuyla A4 PDF’e çeviren Windows uygulaması. Yüzlerce zarfı bir kerede bırakın; her biri ayrı PDF olarak çıkar.
          </p>

          <div className="mt-12 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_2.5rem_minmax(0,22rem)] lg:gap-6">
            <figure className="min-w-0 border border-rule bg-paper-3">
              <figcaption className="truncate border-b border-rule px-4 py-3 font-mono text-[12px] text-ink-2">{ZARF}</figcaption>
              <pre className="overflow-x-auto p-4 font-mono text-[10px] leading-[1.75] sm:text-[12px]">
                {XML.map(([line, hit], i) => (
                  <div key={i} className={hit ? 'font-medium text-ink' : 'text-muted'}>{line}</div>
                ))}
              </pre>
            </figure>

            <div className="flex items-center justify-center self-center text-muted" aria-hidden="true">
              <ArrowRight size={20} strokeWidth={1.5} className="rotate-90 lg:rotate-0" />
            </div>

            <figure className="mx-auto w-full max-w-[22rem]">
              <img
                src={pdfGib}
                alt="ABC2026000000001 numaralı faturanın GİB general.xslt şablonuyla basılmış PDF'i"
                className="block w-full border border-rule"
                width={337}
                height={477}
              />
              <figcaption className="mt-3 text-[13px] leading-snug">
                <span className="block truncate font-mono text-[12px] text-ink-2">{PDF_NAME}</span>
                <span className="mt-1 block text-muted">Zarfa gömülü GİB şablonuyla (general.xslt) basıldı.</span>
              </figcaption>
            </figure>
          </div>
        </section>

        <section className="grid gap-8 border-t border-ink py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-10" aria-labelledby="indir">
          <div>
            <h2 id="indir" className="text-[24px] font-medium tracking-[-0.01em]">Windows için indir</h2>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
              <a href={DOWNLOAD} className="btn-primary h-11 px-5">
                <Download size={14} strokeWidth={1.5} /> ZarfPDF {RELEASE.version} kurulumu
              </a>
              <a href={NOTES} className="btn-quiet">Sürüm notları</a>
            </div>
          </div>

          <div className="min-w-0">
            <dl className="grid grid-cols-[5.5rem_minmax(0,1fr)] text-[15px]">
              {SPECS.map(([k, v]) => (
                <div key={k} className="col-span-2 grid grid-cols-subgrid border-b border-rule py-2.5">
                  <dt className="token pt-1 text-muted">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
              <div className="col-span-2 grid grid-cols-subgrid border-b border-rule py-2.5">
                <dt className="token pt-1 text-muted">SHA-256</dt>
                <dd className="break-all font-mono text-[12px] leading-[1.6] text-ink-2">{RELEASE.sha256}</dd>
              </div>
            </dl>
            <p className="mt-4 max-w-[40rem] text-[14px] leading-relaxed text-muted">
              Kurulum dosyası henüz dijital olarak imzalı değil. İlk açılışta Windows SmartScreen uyarısı çıkarsa “Ek bilgi” ve “Yine de çalıştır” ile devam edin.
            </p>
          </div>
        </section>

        <section className="border-t border-ink" aria-label="Özellikler">
          <dl>
            {FEATURES.map(([term, desc]) => (
              <div key={term} className="grid gap-x-10 gap-y-1 border-b border-rule py-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
                <dt className="text-[18px] font-medium">{term}</dt>
                <dd className="max-w-[40rem] text-[16px] leading-relaxed text-ink-2">{desc}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="pb-20 pt-14">
          <figure>
            <picture>
              <source srcSet={shotDark} media="(prefers-color-scheme: dark)" />
              <img
                src={shotLight}
                alt="ZarfPDF: solda bırakılan zarf, sağda faturanın PDF önizlemesi"
                className="block w-full border border-rule"
                width={1584}
                height={1027}
                loading="lazy"
              />
            </picture>
            <figcaption className="mt-4 max-w-[40rem] text-[14px] text-muted">
              Bırakılan zarflar solda listelenir, seçili olanın PDF’i sağda görünür. “GİB’e sor” faturanın GİB’deki durumunu getirir.
            </figcaption>
          </figure>
        </section>
      </main>

      <footer className="border-t border-rule">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-2 px-4 py-6 text-[13px] text-muted md:px-10">
          <span>ZarfPDF {RELEASE.version}</span>
          <a href={REPO} className="underline-offset-4 hover:text-ink hover:underline">Kaynak kodu GitHub’da</a>
        </div>
      </footer>
    </div>
  );
}
