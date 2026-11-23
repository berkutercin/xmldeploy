import { useEffect, useState } from 'react';
import { ChevronRight, Loader2 } from 'lucide-react';
import { GIB_KIND_LABELS, queryGib, type GibKind, type GibQueryInput, type GibResult } from '../lib/gib';
import { PlateMarks, Seal } from './Seal';

interface Props {
  prefill: GibQueryInput | null;
}

const KINDS: GibKind[] = ['EFATURA', 'EARSIV', 'EIRSALIYE'];

export default function GibView({ prefill }: Props) {
  const [kind, setKind] = useState<GibKind>('EFATURA');
  const [saticiVkn, setSaticiVkn] = useState('');
  const [aliciVkn, setAliciVkn] = useState('');
  const [belgeNo, setBelgeNo] = useState('');
  const [odenecekTutar, setOdenecekTutar] = useState('');
  const [toplamTutar, setToplamTutar] = useState('');
  const [tarih, setTarih] = useState('');
  const [fhash, setFhash] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GibResult | null>(null);
  const [asked, setAsked] = useState<GibQueryInput | null>(null);

  useEffect(() => {
    if (prefill) {
      setKind(prefill.kind);
      setSaticiVkn(prefill.saticiVkn || '');
      setAliciVkn(prefill.aliciVkn || '');
      setBelgeNo(prefill.belgeNo || '');
      setOdenecekTutar(prefill.odenecekTutar || '');
      setToplamTutar(prefill.toplamTutar || '');
      setTarih(prefill.tarih || '');
      setFhash(prefill.fhash || '');
      handleSubmit(prefill);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill]);

  const handleSubmit = async (override?: GibQueryInput) => {
    const input: GibQueryInput = override || { kind, saticiVkn, aliciVkn, belgeNo, odenecekTutar, toplamTutar, tarih, fhash };
    if (!input.saticiVkn.trim() || !input.belgeNo.trim()) return;
    setLoading(true);
    setResult(null);
    setAsked(input);
    try {
      setResult(await queryGib(input));
    } finally {
      setLoading(false);
    }
  };

  const field = (label: string, node: React.ReactNode, hint?: string) => (
    <label className="block">
      <span className="label">{label}</span>
      {node}
      {hint && <span className="mt-1.5 block text-[13px] text-muted">{hint}</span>}
    </label>
  );

  return (
    <div className="grid gap-x-10 gap-y-12 lg:grid-cols-12">
      <section className="min-w-0 lg:col-span-8 xl:col-span-7">
        <div className="flex" role="tablist" aria-label="Belge türü">
          {KINDS.map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={kind === k}
              onClick={() => { setKind(k); setResult(null); }}
              className={`token -ml-px h-10 border px-4 first:ml-0 transition-colors duration-micro ${
                kind === k ? 'relative z-10 border-ink bg-accent text-accent-ink' : 'border-rule text-muted hover:text-ink'
              }`}
            >
              {GIB_KIND_LABELS[k]}
            </button>
          ))}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="mt-8 grid max-w-3xl gap-x-6 gap-y-6 sm:grid-cols-2">
          {field('Satıcı VKN / TCKN',
            <input className="input font-mono" inputMode="numeric" placeholder="1234567890" value={saticiVkn}
              onChange={(e) => setSaticiVkn(e.target.value)} maxLength={11} required />)}
          {field(kind === 'EIRSALIYE' ? 'İrsaliye numarası' : 'Fatura numarası',
            <input className="input font-mono uppercase" placeholder="ABC2026000000001" value={belgeNo}
              onChange={(e) => setBelgeNo(e.target.value.toUpperCase())} maxLength={16} required />, '16 karakter: 3 harf, yıl, sıra.')}

          {kind === 'EARSIV' && (
            <>
              {field('Alıcı VKN / TCKN',
                <input className="input font-mono" inputMode="numeric" placeholder="11111111111" value={aliciVkn}
                  onChange={(e) => setAliciVkn(e.target.value)} maxLength={11} />)}
              {field('Düzenleme tarihi',
                <input type="date" className="input font-mono" value={tarih} onChange={(e) => setTarih(e.target.value)} />)}
              {field('Ödenecek tutar (TL)',
                <input className="input font-mono" inputMode="decimal" placeholder="1250.50" value={odenecekTutar}
                  onChange={(e) => setOdenecekTutar(e.target.value)} />)}
              {field('Mal / hizmet toplamı (TL)',
                <input className="input font-mono" inputMode="decimal" placeholder="1042.08" value={toplamTutar}
                  onChange={(e) => setToplamTutar(e.target.value)} />)}
            </>
          )}

          {kind === 'EFATURA' && (
            <>
              {field('Ödenecek tutar (TL)',
                <input className="input font-mono" inputMode="decimal" placeholder="1250.50" value={odenecekTutar}
                  onChange={(e) => setOdenecekTutar(e.target.value)} />)}
              {field('İmza özeti (FHASH)',
                <input className="input font-mono text-[13px]" placeholder="DigestValue" value={fhash}
                  onChange={(e) => setFhash(e.target.value)} />, 'XML\'den açtıysan kendiliğinden dolar.')}
            </>
          )}

          <div className="flex items-center gap-4 pt-2 sm:col-span-2">
            <button type="submit" className="btn-primary" disabled={loading || !saticiVkn.trim() || !belgeNo.trim()}>
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading ? 'Soruluyor' : 'GİB\'e sor'}
            </button>
            {(!saticiVkn.trim() || !belgeNo.trim()) && <span className="text-[13px] text-muted">Önce vergi ve belge numarasını yaz.</span>}
          </div>
        </form>
      </section>

      <aside className="min-w-0 lg:col-span-4 xl:col-span-5">
        <div className="lg:sticky lg:top-24">
          <div className="plate min-h-[420px] p-8" aria-live="polite">
            <PlateMarks />
            {!asked && !loading && (
              <div className="flex h-full min-h-[356px] flex-col justify-end">
                <p className="max-w-[28ch] text-[17px] text-muted">Sorgu sonucu bu sayfaya basılacak.</p>
              </div>
            )}
            {loading && (
              <div className="flex min-h-[356px] items-center gap-2 text-muted">
                <Loader2 size={14} className="animate-spin" /> GİB yanıtı bekleniyor
              </div>
            )}
            {result && asked && (
              <div>
                <div className="break-all font-mono text-[22px] leading-tight">{asked.belgeNo.toUpperCase()}</div>
                <p className="mt-6 max-w-[40ch] text-[17px]">{result.message}</p>
                <dl className="mt-8 divide-y divide-rule border-y border-rule text-[14px]">
                  <Row k="Tür" v={GIB_KIND_LABELS[asked.kind]} />
                  <Row k="Satıcı" v={asked.saticiVkn} mono />
                  {result.gibTime && <Row k="GİB'e ulaştı" v={result.gibTime} mono />}
                  {result.receiverTime && <Row k="Alıcıya gitti" v={result.receiverTime} mono />}
                  {result.extra && <Row k="Ek bilgi" v={result.extra} />}
                  <Row k="Sorgu" v={new Date(result.checkedAt).toLocaleString('tr-TR')} mono />
                </dl>
                <div className="mt-6 flex flex-wrap items-start gap-4 pb-32">
                  <button type="button" className="btn" onClick={() => handleSubmit(asked)}>Yeniden sor</button>
                  {result.raw && (
                    <details className="text-[13px] text-muted">
                      <summary className="token inline-flex h-10 cursor-pointer list-none items-center gap-1.5 hover:text-ink [&::-webkit-details-marker]:hidden"><ChevronRight size={13} strokeWidth={1.5} /> Ham yanıt</summary>
                      <pre className="mt-2 max-w-full overflow-x-auto bg-paper-2 p-3 font-mono text-[12px] text-ink">{result.raw}</pre>
                    </details>
                  )}
                </div>
                <div className="absolute -bottom-10 -left-6 z-10">
                  <Seal result={result} size={148} />
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex gap-6 py-2.5">
      <dt className="token w-32 shrink-0 pt-1 text-muted">{k}</dt>
      <dd className={mono ? 'font-mono text-[13px]' : ''}>{v}</dd>
    </div>
  );
}
