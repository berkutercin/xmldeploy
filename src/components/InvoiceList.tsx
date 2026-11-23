import { FileDown, Loader2, Plus, SearchCheck, X } from 'lucide-react';
import type { DocItem } from '../lib/batch';
import { profileLabel } from '../lib/ubl';
import { canQuery, type GibResult } from '../lib/gib';
import { StatusMark } from './Seal';

/**
 * Belge listesi: her fatura tek bir fiş. Solda seçim kutusu, ortada numara + kaynak dosya
 * ve satıcı/alıcı, sağda tutar, en sağda GİB sonucu ve işlemler.
 */

interface Props {
  items: DocItem[];
  selectedId: string | null;
  checked: Set<string>;
  gib: Record<string, GibResult | 'loading'>;
  busyRow: string | null;
  busy: boolean;
  adding: boolean;
  onSelect: (id: string) => void;
  onToggle: (id: string, shift: boolean) => void;
  onToggleAll: () => void;
  onClearChecks: () => void;
  onQuery: (item: DocItem) => void;
  onPdf: (item: DocItem) => void;
  onOpenInGib: (item: DocItem) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
  onClearAll: () => void;
}

const fmtDate = (d?: string) => (d ? d.replace(/^(\d{4})-(\d{2})-(\d{2}).*/, '$3.$2.$1') : '');
const fmtAmount = (v?: string) => {
  if (!v) return '—';
  const n = Number(v);
  return Number.isNaN(n) ? v : n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function InvoiceList(p: Props) {
  const n = p.checked.size;
  const all = n === p.items.length;
  // Aynı dosyadan birden çok belge çıktıysa dosya adının yanına sırası yazılır (zarf · 1/2).
  const siblings = new Map<string, DocItem[]>();
  for (const i of p.items) siblings.set(i.source, [...(siblings.get(i.source) || []), i]);

  return (
    <div className="list-face mt-10">
      <div className="flex items-center gap-2 border-b border-rule pb-2">
        <label className="grid h-8 w-10 cursor-pointer place-items-center">
          <input
            type="checkbox"
            className="check"
            checked={all}
            ref={(el) => { if (el) el.indeterminate = n > 0 && !all; }}
            onChange={p.onToggleAll}
            aria-label="Tümünü seç"
          />
        </label>
        <span className="token text-muted">{n ? `${n} / ${p.items.length} seçili · Shift ile aralık seç` : 'Tümünü seç'}</span>
        <div className="ml-auto flex items-center gap-3">
          {n > 0 && <button type="button" className="btn-quiet h-8" onClick={p.onClearChecks}>Seçimi kaldır</button>}
          <button type="button" className="btn-quiet h-8" onClick={p.onAdd} disabled={p.adding}>
            <Plus size={13} strokeWidth={1.5} /> Ekle
          </button>
          <button type="button" className="btn-quiet h-8 hover:text-error" onClick={p.onClearAll}>Temizle</button>
        </div>
      </div>

      <ol className="mt-2 space-y-2" aria-label="Belgeler">
        {p.items.map((item) => {
          const sel = item.id === p.selectedId;
          const group = siblings.get(item.source)!;
          const file = item.source.split('/').pop() || item.source;
          const fileLabel = group.length > 1 ? `${file} · ${group.indexOf(item) + 1}/${group.length}` : file;
          return (
            <li
              key={item.id}
              onClick={() => p.onSelect(item.id)}
              aria-current={sel || undefined}
              className={`group grid cursor-pointer grid-cols-[2.5rem_minmax(0,1fr)_auto_8.5rem] border transition-colors duration-micro ${
                sel ? 'border-ink bg-paper-2' : 'border-transparent bg-paper-3 hover:border-rule'
              }`}
            >
              <label className="grid cursor-pointer place-items-center border-r border-rule" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  className="check"
                  checked={p.checked.has(item.id)}
                  onChange={() => {}}
                  onClick={(e) => p.onToggle(item.id, e.shiftKey)}
                  aria-label={`${item.info.number || 'Belge'} seç`}
                />
              </label>

              <div className="min-w-0 px-4 py-3">
                <div className="flex items-baseline gap-3">
                  <button
                    type="button"
                    className="shrink-0 text-left text-[14px] text-ink focus-visible:outline-offset-4"
                    onClick={(e) => { e.stopPropagation(); p.onSelect(item.id); }}
                  >
                    {item.info.number || 'Numarasız belge'}
                  </button>
                  <span className="truncate text-[11px] text-muted" title={item.source}>{fileLabel}</span>
                </div>
                <dl className="mt-1.5 grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-2 text-[14px] leading-snug">
                  <dt className="text-[12px] text-muted">Satıcı</dt>
                  <dd className="truncate" title={item.info.supplierName}>{item.info.supplierName || '—'}</dd>
                  <dt className="text-[12px] text-muted">Alıcı</dt>
                  <dd className="truncate" title={item.info.customerName}>{item.info.customerName || '—'}</dd>
                </dl>
              </div>

              <div className="flex flex-col items-end justify-center px-4 py-3">
                <span className="whitespace-nowrap text-[20px] tabular-nums leading-none">{fmtAmount(item.info.payableAmount)}</span>
                <span className="mt-1.5 whitespace-nowrap text-[12px] text-muted" title={profileLabel(item.info)}>
                  {item.info.currency} · {profileLabel(item.info).replace(/\s*\(.*\)$/, '')} · {fmtDate(item.info.issueDate)}
                </span>
              </div>

              <div className="flex flex-col justify-between gap-2 border-l border-rule px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                {canQuery(item.info)
                  ? <StatusMark result={p.gib[item.id]} onQuery={() => p.onQuery(item)} />
                  : <span className="text-[13px] text-muted">Sorgulanamaz</span>}
                <div className="-ml-2 flex items-center opacity-60 transition-opacity duration-micro group-hover:opacity-100 group-focus-within:opacity-100">
                  <button type="button" className="icon-btn" title="PDF indir" aria-label="PDF indir"
                    onClick={() => p.onPdf(item)} disabled={p.busyRow === item.id || p.busy}>
                    {p.busyRow === item.id ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} strokeWidth={1.5} />}
                  </button>
                  {canQuery(item.info) && (
                    <button type="button" className="icon-btn" title="GİB formunda aç" aria-label="GİB formunda aç" onClick={() => p.onOpenInGib(item)}>
                      <SearchCheck size={14} strokeWidth={1.5} />
                    </button>
                  )}
                  <button type="button" className="icon-btn hover:text-error" title="Listeden çıkar" aria-label="Listeden çıkar" onClick={() => p.onRemove(item.id)}>
                    <X size={14} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
