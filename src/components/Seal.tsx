import { useId } from 'react';
import { Loader2 } from 'lucide-react';
import { GIB_STATUS_LABELS, type GibResult, type GibStatus } from '../lib/gib';

/**
 * GİB mührü: sorgu sonucu, levhanın köşesine basılan yuvarlak bir damga olarak gösterilir.
 * Halka metni kaynağı ve zamanı, ortası durumu söyler.
 */

const CENTER_TONE: Record<GibStatus, string> = {
  OK: 'text-seal-ink',
  NOT_FOUND: 'text-ink',
  REJECTED: 'text-error',
  CANCELLED: 'text-error',
  ERROR: 'text-error',
};

export function Seal({ result, size }: { result: GibResult; size?: number }) {
  const id = useId().replace(/:/g, '');
  const filled = result.status === 'OK' || result.status === 'CANCELLED' || result.status === 'REJECTED';
  const when = new Date(result.checkedAt).toLocaleDateString('tr-TR');
  const ring = `GİB SORGUSU · ${when} · KOD ${result.code || '—'} · `;
  return (
    <div
      key={result.checkedAt}
      className="stamp-in pointer-events-none select-none"
      style={size ? { width: size, height: size } : { width: '100%', aspectRatio: '1' }}
      role="img"
      aria-label={`GİB sonucu: ${GIB_STATUS_LABELS[result.status]}`}
    >
      <svg viewBox="0 0 120 120" width="100%" height="100%" aria-hidden="true">
        <defs>
          <path id={`r${id}`} d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0" />
        </defs>
        <circle
          cx="60"
          cy="60"
          r="58"
          className={filled ? 'fill-seal' : 'fill-paper-3'}
          stroke="currentColor"
          strokeWidth={filled ? 0 : 1}
          strokeDasharray={result.status === 'ERROR' ? '3 3' : undefined}
        />
        <circle cx="60" cy="60" r="34" fill="none" stroke="currentColor" strokeWidth="0.75" className="text-seal-ink" opacity="0.5" />
        <text className="fill-seal-ink" style={{ font: '500 8.2px var(--font-mono)', letterSpacing: '0.14em' }}>
          <textPath href={`#r${id}`} textLength="272">{ring}</textPath>
        </text>
        <text
          x="60"
          y="64"
          textAnchor="middle"
          className={`fill-current ${CENTER_TONE[result.status]}`}
          style={{ font: '600 12px var(--font-body)', letterSpacing: '0.04em', textTransform: 'uppercase' }}
          textDecoration={result.status === 'CANCELLED' ? 'line-through' : undefined}
        >
          {GIB_STATUS_LABELS[result.status].toLocaleUpperCase('tr-TR')}
        </text>
      </svg>
    </div>
  );
}

/** Satır içi küçük durum işareti: renk olmadan da okunur (dolu, boş, kesik, üstü çizili metin). */
export function StatusMark({ result, onQuery }: { result?: GibResult | 'loading'; onQuery: () => void }) {
  if (result === 'loading') {
    return (
      <span className="inline-flex items-center gap-2 text-[13px] text-muted">
        <Loader2 size={12} className="animate-spin" /> Soruluyor
      </span>
    );
  }
  if (!result) {
    return (
      <button type="button" onClick={onQuery} className="btn-quiet h-auto">
        GİB'e sor
      </button>
    );
  }
  const s = result.status;
  const dot =
    s === 'OK'
      ? 'bg-seal-ink border-seal-ink'
      : s === 'ERROR'
        ? 'border-dashed border-error'
        : s === 'NOT_FOUND'
          ? 'border-ink'
          : 'bg-error border-error';
  return (
    <button
      type="button"
      onClick={onQuery}
      title={`${result.message}\nTekrar sormak için tıkla.`}
      className="inline-flex items-center gap-2 text-left text-[13px] hover:underline underline-offset-4"
    >
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full border ${dot}`} aria-hidden="true" />
      <span className={s === 'OK' ? 'text-ink' : s === 'NOT_FOUND' ? 'text-ink' : 'text-error'} style={s === 'CANCELLED' ? { textDecoration: 'line-through' } : undefined}>
        {GIB_STATUS_LABELS[s]}
      </span>
    </button>
  );
}

export function PlateMarks() {
  return (
    <>
      <span className="plate-mark -left-2 -top-2" aria-hidden="true" />
      <span className="plate-mark -right-2 -top-2" aria-hidden="true" />
      <span className="plate-mark -bottom-2 -left-2" aria-hidden="true" />
      <span className="plate-mark -bottom-2 -right-2" aria-hidden="true" />
    </>
  );
}
