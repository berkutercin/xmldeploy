import { useCallback, useEffect, useRef, useState } from 'react';
import { FileDown, Printer, Maximize2, FileCode2, SearchCheck, Loader2, Upload } from 'lucide-react';
import {
  loadDocuments,
  convertAllToZip,
  extractedXmlsToZip,
  itemToPdf,
  baseName,
  timestamp,
  type DocItem,
  type FailedSource,
  type BatchProgress,
} from '../lib/batch';
import { downloadBlob } from '../lib/pdf';
import { canQuery, inputFromDocInfo, queryGib, type GibQueryInput, type GibResult } from '../lib/gib';
import PreviewModal from './PreviewModal';
import PlatePreview from './PlatePreview';
import { PlateMarks, Seal } from './Seal';
import InvoiceList from './InvoiceList';

interface Props {
  onOpenInGib: (input: GibQueryInput) => void;
  onCount?: (files: number, docs: number) => void;
}

export default function ConvertView({ onOpenInGib, onCount }: Props) {
  const [items, setItems] = useState<DocItem[]>([]);
  const [failed, setFailed] = useState<FailedSource[]>([]);
  const [loading, setLoading] = useState<{ done: number; total: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [batch, setBatch] = useState<BatchProgress | null>(null);
  const [busyRow, setBusyRow] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<DocItem | null>(null);
  const [gib, setGib] = useState<Record<string, GibResult | 'loading'>>({});
  const [gibAllRunning, setGibAllRunning] = useState(false);
  // İşaretlenen belgeler; boşsa toplu işlemler listedeki her belgeye uygulanır.
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const lastChecked = useRef<string | null>(null);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const cancelRef = useRef(false);
  const itemsRef = useRef<DocItem[]>([]);
  itemsRef.current = items;
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const dirInput = useRef<HTMLInputElement>(null);

  const showToast = (kind: 'ok' | 'err', text: string) => {
    setToast({ kind, text });
    setTimeout(() => setToast((t) => (t?.text === text ? null : t)), 4500);
  };

  const addFiles = useCallback(async (files: File[]) => {
    if (!files.length) return;
    setLoading({ done: 0, total: files.length });
    try {
      const res = await loadDocuments(files, (done, total) => setLoading({ done, total }));
      // Aynı dosya ikinci kez verilirse eklenmez; yoksa kaynak grubu iki katı belge gösterir.
      const key = (i: DocItem) => `${i.source}#${i.indexInSource}`;
      const known = new Set(itemsRef.current.map(key));
      const fresh = res.items.filter((i) => !known.has(key(i)));
      setItems((prev) => [...prev, ...fresh]);
      setFailed((prev) => [...prev, ...res.failed]);
      setSelectedId((cur) => cur ?? fresh[0]?.id ?? null);
      if (res.items.length && !fresh.length) showToast('err', 'Bu dosyalar zaten listede.');
      else if (!res.items.length && res.failed.length) showToast('err', 'Dönüştürülecek belge bulunamadı. Nedeni listenin üstünde.');
    } finally {
      setLoading(null);
    }
  }, []);

  // Ctrl+O dosya açar, Ctrl+V panodaki dosyaları ya da XML metnini ekler. GİB sekmesi açıkken devre dışı.
  useEffect(() => {
    const active = () => !!fileInput.current && !fileInput.current.closest('[hidden]');
    const typing = (t: EventTarget | null) => t instanceof HTMLElement && !!t.closest('input, textarea, [contenteditable="true"]');
    const onKey = (e: KeyboardEvent) => {
      if (active() && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        fileInput.current?.click();
      }
    };
    const onPaste = (e: ClipboardEvent) => {
      if (!active() || typing(e.target) || !e.clipboardData) return;
      const files = Array.from(e.clipboardData.files);
      const text = e.clipboardData.getData('text/plain').trim();
      if (files.length) addFiles(files);
      else if (text.startsWith('<')) addFiles([new File([text], 'panodan.xml', { type: 'application/xml' })]);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('paste', onPaste);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('paste', onPaste);
    };
  }, [addFiles]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const clearAll = () => {
    setItems([]);
    setFailed([]);
    setGib({});
    setChecked(new Set());
    setSelectedId(null);
  };

  const removeItem = (id: string) => {
    setChecked((c) => { const n = new Set(c); n.delete(id); return n; });
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      if (selectedId === id) setSelectedId(next[0]?.id ?? null);
      return next;
    });
  };

  const downloadOnePdf = async (item: DocItem) => {
    setBusyRow(item.id);
    try {
      const { blob, warning } = await itemToPdf(item);
      downloadBlob(blob, `${baseName(item)}.pdf`);
      if (warning) showToast('err', warning);
    } catch (e) {
      showToast('err', `${baseName(item)} PDF'e çevrilemedi: ${(e as Error).message}`);
    } finally {
      setBusyRow(null);
    }
  };

  const target = checked.size ? items.filter((i) => checked.has(i.id)) : items;
  // Shift ile tıklama, son işaretlenenden bu satıra kadar aralığı aynı duruma getirir.
  const toggleCheck = (id: string, shift: boolean) => {
    const prev = lastChecked.current;
    setChecked((c) => {
      const n = new Set(c);
      const on = !c.has(id);
      const a = items.findIndex((i) => i.id === prev);
      const b = items.findIndex((i) => i.id === id);
      const range = shift && a >= 0 ? items.slice(Math.min(a, b), Math.max(a, b) + 1) : [items[b]];
      for (const i of range) (on ? n.add(i.id) : n.delete(i.id));
      return n;
    });
    lastChecked.current = id;
  };
  const toggleAll = () => setChecked((c) => (c.size === items.length ? new Set() : new Set(items.map((i) => i.id))));

  const downloadAll = async () => {
    const items = target;
    if (items.length === 1) return downloadOnePdf(items[0]);
    cancelRef.current = false;
    setBatch({ done: 0, total: items.length, failed: 0, current: 'Başlıyor' });
    try {
      const { zip, failed: failedCount, cancelled } = await convertAllToZip(items, (p) => setBatch(p), () => cancelRef.current);
      if (!cancelled) {
        downloadBlob(zip, `PDF_${timestamp()}.zip`);
        showToast(failedCount ? 'err' : 'ok', failedCount
          ? `${items.length - failedCount} PDF indirildi, ${failedCount} belge çevrilemedi (ZIP içindeki _RAPOR.txt'ye bak).`
          : `${items.length} PDF tek ZIP olarak indirildi.`);
      }
    } catch (e) {
      showToast('err', `Toplu çevirme durdu: ${(e as Error).message}`);
    } finally {
      setBatch(null);
    }
  };

  const zarfItems = target.filter((i) => i.fromZarf);
  const downloadExtractedXmls = async () => {
    if (zarfItems.length === 1) {
      downloadBlob(new Blob([zarfItems[0].xml], { type: 'application/xml' }), `${baseName(zarfItems[0])}.xml`);
      return;
    }
    downloadBlob(await extractedXmlsToZip(zarfItems), `XML_${timestamp()}.zip`);
  };

  const queryOne = async (item: DocItem) => {
    setGib((g) => ({ ...g, [item.id]: 'loading' }));
    const res = await queryGib(inputFromDocInfo(item.info));
    setGib((g) => ({ ...g, [item.id]: res }));
  };

  const queryAll = async () => {
    setGibAllRunning(true);
    try {
      for (const item of target.filter((i) => canQuery(i.info))) {
        await queryOne(item);
        await new Promise((r) => setTimeout(r, 250));
      }
    } finally {
      setGibAllRunning(false);
    }
  };

  const fileCount = new Set(items.map((i) => i.source.split('/')[0])).size;
  useEffect(() => onCount?.(fileCount, items.length), [fileCount, items.length, onCount]);
  const queryable = target.filter((i) => canQuery(i.info)).length;
  const selected = items.find((i) => i.id === selectedId) || null;
  const selectedGib = selected ? gib[selected.id] : undefined;

  const dropProps = {
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); },
    onDragLeave: (e: React.DragEvent) => { if (e.currentTarget === e.target) setDragOver(false); },
    onDrop,
  };
  const pickers = (
    <>
      <input ref={fileInput} type="file" multiple accept=".xml,.zip,application/xml,text/xml,application/zip" className="hidden"
        onChange={(e) => { addFiles(Array.from(e.target.files || [])); e.target.value = ''; }} />
      <input ref={dirInput} type="file" multiple className="hidden"
        {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
        onChange={(e) => { addFiles(Array.from(e.target.files || [])); e.target.value = ''; }} />
    </>
  );

  if (!items.length) {
    return (
      <div {...dropProps} className="flex min-h-[calc(100vh-11rem)] flex-col items-center justify-center gap-6">
        {pickers}
        <div
          className={`plate flex w-full max-w-[760px] flex-col items-center gap-5 px-10 py-[72px] text-center transition-colors duration-micro ${dragOver ? 'bg-seal' : ''}`}
          style={{ backgroundImage: 'radial-gradient(var(--color-rule) 1px, transparent 1px)', backgroundSize: '18px 18px' }}
        >
          <PlateMarks />
          <div className="grid h-14 w-14 place-items-center border border-rule bg-paper-2">
            {loading ? <Loader2 size={22} className="animate-spin" /> : <Upload size={22} strokeWidth={1.6} />}
          </div>
          <h1 className="text-[26px] font-semibold tracking-[-0.01em]">
            {loading ? `Okunuyor ${loading.done} / ${loading.total}` : dragOver ? 'Bırak' : 'Fatura dosyalarını buraya bırak'}
          </h1>
          <p className="max-w-[460px] text-[15px] leading-relaxed text-muted">
            e-Fatura, e-Arşiv ve e-İrsaliye XML'leri, ZIP ya da zarf dosyaları. Birden fazla dosyayı aynı anda bırakabilirsin.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <button type="button" className="btn-primary h-11 px-[22px]" onClick={() => fileInput.current?.click()} disabled={!!loading}>Dosya seç</button>
            <button type="button" className="btn h-11 px-[22px]" onClick={() => dirInput.current?.click()} disabled={!!loading}>Klasör seç</button>
          </div>
        </div>
        <p className="flex flex-wrap justify-center gap-5 text-[13px] text-muted">
          <span><kbd className="border border-rule px-1.5 py-0.5 font-mono text-[12px] text-ink">Ctrl+O</kbd> dosya aç</span>
          <span><kbd className="border border-rule px-1.5 py-0.5 font-mono text-[12px] text-ink">Ctrl+V</kbd> panodan yapıştır</span>
        </p>
        {failed.length > 0 && (
          <div className="w-full max-w-[760px] border-t border-error pt-4">
            <div className="flex items-baseline gap-4">
              <span className="token text-error">{failed.length} dosya okunamadı</span>
              <button type="button" className="btn-quiet ml-auto h-auto" onClick={() => setFailed([])}>Gizle</button>
            </div>
            <ul className="mt-3 max-h-32 space-y-1 overflow-auto text-[13px] text-ink-2">
              {failed.map((f, i) => (
                <li key={i}><span className="font-mono text-[12px]">{f.source}</span> · {f.error}</li>
              ))}
            </ul>
          </div>
        )}
        {toast && (
          <div role="status" className={`fixed bottom-6 right-6 z-50 max-w-md border bg-paper-3 px-4 py-3 text-[14px] shadow-[0_8px_24px_-12px_rgba(0,0,0,0.25)] ${toast.kind === 'ok' ? 'border-ink text-ink' : 'border-error text-error'}`}>
            {toast.text}
          </div>
        )}
      </div>
    );
  }

  return (
    <div {...dropProps} className="grid gap-x-10 gap-y-12 lg:grid-cols-12">
      {pickers}
      <section className="min-w-0 lg:col-span-8 xl:col-span-7">
        <div className="flex flex-wrap items-center gap-3">
          {items.length ? (
            <>
              <button type="button" className="btn-primary" onClick={downloadAll} disabled={!!batch}>
                <FileDown size={14} strokeWidth={1.5} />
                {checked.size
                  ? `Seçili ${target.length} PDF'i indir`
                  : items.length === 1 ? 'PDF indir' : `${items.length} PDF indir · ZIP`}
              </button>
              {queryable > 0 && (
                <button type="button" className="btn" onClick={queryAll} disabled={gibAllRunning}>
                  {gibAllRunning ? <Loader2 size={14} className="animate-spin" /> : <SearchCheck size={14} strokeWidth={1.5} />}
                  {checked.size ? "Seçilileri GİB'e sor" : "Hepsini GİB'e sor"}
                </button>
              )}
              {zarfItems.length > 0 && (
                <button type="button" className="btn" onClick={downloadExtractedXmls} title="GİB görüntüleyicide açılan saf fatura XML'leri">
                  <FileCode2 size={14} strokeWidth={1.5} /> Zarftaki XML'ler
                </button>
              )}
            </>
          ) : null}
          {loading && (
            <span className="token inline-flex items-center gap-2 text-muted" role="status">
              <Loader2 size={13} className="animate-spin" /> Okunuyor {loading.done} / {loading.total}
            </span>
          )}
        </div>

        {batch && (
          <div className="mt-8" role="status">
            <div className="flex items-center gap-4">
              <span className="token text-ink">{batch.done} / {batch.total} çevrildi</span>
              {batch.failed > 0 && <span className="token text-error">{batch.failed} hata</span>}
              <span className="truncate text-[13px] text-muted">{batch.current}</span>
              <button type="button" className="btn-quiet ml-auto h-auto" onClick={() => (cancelRef.current = true)}>Durdur</button>
            </div>
            <div className="mt-3 h-px w-full bg-rule">
              <div className="h-px bg-ink transition-[width] duration-short" style={{ width: `${(batch.done / batch.total) * 100}%` }} />
            </div>
          </div>
        )}


        {failed.length > 0 && (
          <div className="mt-8 border-t border-error pt-4">
            <div className="flex items-baseline gap-4">
              <span className="token text-error">{failed.length} dosya okunamadı</span>
              <button type="button" className="btn-quiet ml-auto h-auto" onClick={() => setFailed([])}>Gizle</button>
            </div>
            <ul className="mt-3 max-h-32 space-y-1 overflow-auto text-[13px] text-ink-2">
              {failed.map((f, i) => (
                <li key={i}><span className="font-mono text-[12px]">{f.source}</span> · {f.error}</li>
              ))}
            </ul>
          </div>
        )}

        {items.length > 0 && (
          <InvoiceList
            items={items}
            selectedId={selectedId}
            checked={checked}
            gib={gib}
            busyRow={busyRow}
            busy={!!batch}
            adding={!!loading}
            onSelect={setSelectedId}
            onToggle={toggleCheck}
            onToggleAll={toggleAll}
            onClearChecks={() => setChecked(new Set())}
            onQuery={queryOne}
            onPdf={downloadOnePdf}
            onOpenInGib={(i) => onOpenInGib(inputFromDocInfo(i.info))}
            onRemove={removeItem}
            onAdd={() => fileInput.current?.click()}
            onClearAll={clearAll}
          />
        )}

      </section>

      <aside className="min-w-0 lg:col-span-4 xl:col-span-5">
        <div className="lg:sticky lg:top-24" style={{ maxWidth: 'max(360px, calc((100vh - 300px) * 0.707))' }}>
          {selected ? (
            <>
              <div className="plate p-3 pb-[76px]">
                <PlateMarks />
                <PlatePreview item={selected} onFrame={(f) => (frameRef.current = f)} />
                {selectedGib && selectedGib !== 'loading' && (
                  <div className="absolute -left-6 bottom-0 z-10 w-[clamp(96px,24%,132px)] translate-y-1/2">
                    <Seal result={selectedGib} />
                  </div>
                )}
              </div>
              <div className="mt-4 pl-24 xl:pl-32">
                <div>
                  <div className="min-w-0 break-all font-mono text-[13px]">{selected.info.number || 'Belge'}</div>
                  <div className="mt-1 text-[13px] leading-snug text-muted">{selected.info.supplierName}</div>
                  <div className="-ml-2 mt-2 flex items-center gap-1">
                    <button type="button" className="icon-btn" title="PDF indir" aria-label="Bu belgeyi PDF indir" onClick={() => downloadOnePdf(selected)}>
                      <FileDown size={15} strokeWidth={1.5} />
                    </button>
                    <button type="button" className="icon-btn" title="Yazdır" aria-label="Yazdır" onClick={() => frameRef.current?.contentWindow?.print()}>
                      <Printer size={15} strokeWidth={1.5} />
                    </button>
                    {selected.fromZarf && (
                      <button type="button" className="icon-btn" title="Zarftan çıkan XML'i indir" aria-label="Zarftan çıkan XML'i indir"
                        onClick={() => downloadBlob(new Blob([selected.xml], { type: 'application/xml' }), `${baseName(selected)}.xml`)}>
                        <FileCode2 size={15} strokeWidth={1.5} />
                      </button>
                    )}
                    <button type="button" className="icon-btn" title="Tam boy aç" aria-label="Tam boy aç" onClick={() => setExpanded(selected)}>
                      <Maximize2 size={15} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className={`plate flex aspect-[794/1123] w-full flex-col items-center justify-center gap-3 transition-colors duration-micro ${dragOver ? 'bg-seal' : 'hover:bg-paper-2'}`}
              style={{ backgroundImage: 'radial-gradient(var(--color-rule) 1px, transparent 1px)', backgroundSize: '16px 16px' }}
            >
              <PlateMarks />
              <span className="bg-paper-3 px-3 py-1 text-[17px]">{dragOver ? 'Bırak' : 'Dosyaları bu sayfaya bırak'}</span>
              <span className="token bg-paper-3 px-3 py-1 text-muted">PDF burada görünecek</span>
            </button>
          )}
        </div>
      </aside>

      {dragOver && items.length > 0 && (
        <div className="pointer-events-none fixed inset-3 z-40 border border-ink bg-seal/40" aria-hidden="true">
          <span className="token absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-paper-3 px-4 py-3 text-ink">Bırak, listeye eklensin</span>
        </div>
      )}

      {expanded && <PreviewModal item={expanded} onClose={() => setExpanded(null)} onError={(m) => showToast('err', m)} />}

      {toast && (
        <div role="status" className={`fixed bottom-6 right-6 z-50 max-w-md border bg-paper-3 px-4 py-3 text-[14px] shadow-[0_8px_24px_-12px_rgba(0,0,0,0.25)] ${toast.kind === 'ok' ? 'border-ink text-ink' : 'border-error text-error'}`}>
          {toast.text}
        </div>
      )}
    </div>
  );
}
