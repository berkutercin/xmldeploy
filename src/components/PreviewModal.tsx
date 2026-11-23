import { useEffect, useRef, useState } from 'react';
import { FileDown, Printer, X, Loader2, FileCode2, AlertTriangle } from 'lucide-react';
import type { DocItem } from '../lib/batch';
import { baseName } from '../lib/batch';
import { renderDocument, type RenderResult } from '../lib/render';
import { downloadBlob, htmlToPdf, writeToFrame } from '../lib/pdf';

interface Props {
  item: DocItem;
  onClose: () => void;
  onError: (msg: string) => void;
}

export default function PreviewModal({ item, onClose, onError }: Props) {
  const frame = useRef<HTMLIFrameElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  // Belge çerçevesi içeriği kadar büyür; kaydırma yalnızca pencerede olur (tek çubuk).
  const [size, setSize] = useState({ w: 820, h: 1000 });
  const [availW, setAvailW] = useState(820);
  const [render, setRender] = useState<RenderResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    renderDocument(item.xml, item.docType)
      .then(async (r) => {
        if (!alive) return;
        setRender(r);
        const f = frame.current;
        if (!f) return;
        const doc = await writeToFrame(f, r.html);
        const root = doc.documentElement;
        root.style.overflow = 'hidden';
        // Pencere genişledikçe büyüyen tasarımlar için genişlik sabitlenene kadar ölç (en çok 6 adım).
        let w = 820;
        for (let i = 0; i < 6 && alive && root.scrollWidth > w + 3 && root.scrollWidth < 4000; i++) {
          w = root.scrollWidth;
          f.style.width = `${w}px`;
          await new Promise((res) => setTimeout(res, 120));
        }
        if (alive) setSize({ w, h: root.scrollHeight });
      })
      .catch((e) => alive && setError((e as Error).message));
    return () => { alive = false; };
  }, [item]);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setAvailW(e.contentRect.width));
    ro.observe(el);
    // Arkadaki sayfa kaymasın; tek kaydırma çubuğu bu pencerenin.
    const page = document.documentElement;
    const prev = page.style.overflow;
    page.style.overflow = 'hidden';
    return () => {
      ro.disconnect();
      page.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const downloadPdf = async () => {
    if (!render) return;
    setPdfBusy(true);
    try {
      downloadBlob(await htmlToPdf(render.html), `${baseName(item)}.pdf`);
    } catch (e) {
      onError(`PDF oluşturulamadı: ${(e as Error).message}`);
    } finally {
      setPdfBusy(false);
    }
  };

  const print = () => frame.current?.contentWindow?.print();

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-ink/50 p-6" onClick={onClose} role="dialog" aria-modal="true" aria-label="Belge önizleme">
      <div className="flex w-full max-w-5xl flex-col border border-ink bg-paper" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-wrap items-center gap-3 border-b border-rule px-5 py-3">
          <div className="mr-auto min-w-0">
            <div className="truncate font-mono text-[13px]">{item.info.number || 'Belge'} · {item.info.supplierName}</div>
            <div className="token mt-1 truncate text-muted">
              {render ? (render.source === 'xslt' ? 'Belgenin kendi şablonu' : 'Standart şablon') : 'Diziliyor'}
            </div>
          </div>
          <button className="btn-primary" onClick={downloadPdf} disabled={!render || pdfBusy}>
            {pdfBusy ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} strokeWidth={1.5} />} PDF indir
          </button>
          <button className="btn" onClick={print} disabled={!render} title="Yazdır penceresinden PDF seçersen metni seçilebilir çıktı alırsın">
            <Printer size={14} strokeWidth={1.5} /> Yazdır
          </button>
          {item.fromZarf && (
            <button className="btn" onClick={() => downloadBlob(new Blob([item.xml], { type: 'application/xml' }), `${baseName(item)}.xml`)}>
              <FileCode2 size={14} strokeWidth={1.5} /> XML
            </button>
          )}
          <button className="icon-btn ml-2" onClick={onClose} aria-label="Kapat">
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        {render?.warning && (
          <div className="flex items-center gap-2 border-b border-rule px-5 py-2 text-[13px] text-ink-2">
            <AlertTriangle size={14} strokeWidth={1.5} className="shrink-0" />
            <span>{render.warning}</span>
          </div>
        )}

        <div ref={scroller} className="relative flex-1 overflow-y-auto overflow-x-hidden p-6">
          {!render && !error && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 text-[13px] text-muted">
              <Loader2 className="animate-spin" size={14} /> Sayfa diziliyor
            </div>
          )}
          {error && <div className="absolute inset-0 flex items-center justify-center p-6 text-[14px] text-error">Bu belge gösterilemedi: {error}</div>}
          {(() => {
            const scale = Math.min(1, availW / size.w);
            return (
              <div className="mx-auto overflow-hidden border border-rule bg-white" style={{ width: size.w * scale, height: size.h * scale }}>
                <iframe
                  ref={frame}
                  title="Belge önizleme"
                  scrolling="no"
                  className="block origin-top-left border-0 bg-white"
                  style={{ width: size.w, height: size.h, transform: `scale(${scale})` }}
                />
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
