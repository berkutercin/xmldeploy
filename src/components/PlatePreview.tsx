import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { DocItem } from '../lib/batch';
import { renderDocument, type RenderResult } from '../lib/render';
import { writeToFrame } from '../lib/pdf';

const A4_W = 794;
const A4_H = 1123;

/**
 * Seçili belgenin canlı önizlemesi: A4 sayfa, levha genişliğine ölçeklenir.
 * PDF'e dönüşecek olan tam olarak budur.
 */
export default function PlatePreview({
  item,
  onFrame,
}: {
  item: DocItem;
  onFrame?: (frame: HTMLIFrameElement | null, render: RenderResult | null) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [boxW, setBoxW] = useState(A4_W / 2);
  const [docW, setDocW] = useState(A4_W);
  // A4'ten geniş tasarımlar PDF'te olduğu gibi sayfa genişliğine sığdırılır.
  const scale = boxW / Math.max(A4_W, docW);
  const [render, setRender] = useState<RenderResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBoxW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let alive = true;
    setRender(null);
    setDocW(A4_W);
    setError(null);
    onFrame?.(null, null);
    renderDocument(item.xml, item.docType)
      .then(async (r) => {
        if (!alive || !frame.current) return;
        await writeToFrame(frame.current, r.html);
        if (!alive) return;
        // Önizleme yalnızca ilk sayfayı ölçekli gösterir; çerçevenin kendi kaydırma çubuğu gereksiz.
        const root = frame.current.contentDocument?.documentElement;
        if (root) {
          root.style.overflow = 'hidden';
          // Bazı tasarımlar çerçeve genişledikçe büyür; genişlik sabitlenene kadar ölç (en çok 6 adım).
          let w = A4_W;
          for (let i = 0; i < 6 && alive && root.scrollWidth > w + 3 && root.scrollWidth < 4000; i++) {
            w = root.scrollWidth;
            setDocW(w);
            await new Promise((r) => setTimeout(r, 120));
          }
        }
        setRender(r);
        onFrame?.(frame.current, r);
      })
      .catch((e) => alive && setError((e as Error).message));
    return () => {
      alive = false;
    };
    // onFrame kasıtlı olarak bağımlılık değil: yalnızca belge değişince yeniden çiz.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item]);

  return (
    <div ref={box} className="relative w-full overflow-hidden bg-white" style={{ height: A4_H * (boxW / A4_W) }}>
      <iframe
        ref={frame}
        title={`${item.info.number || 'Belge'} önizleme`}
        tabIndex={-1}
        className="pointer-events-none absolute left-0 top-0 origin-top-left border-0 bg-white"
        style={{ width: Math.max(A4_W, docW), height: A4_H * Math.max(A4_W, docW) / A4_W, transform: `scale(${scale})`, opacity: render ? 1 : 0 }}
      />
      {!render && !error && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 text-[13px] text-neutral-500">
          <Loader2 size={14} className="animate-spin" /> Sayfa diziliyor
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center p-8 text-center text-[13px] text-[#a8322b]">
          Bu belge gösterilemedi: {error}
        </div>
      )}
    </div>
  );
}
