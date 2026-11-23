import type { DocInfo } from './ubl';

export type GibKind = 'EFATURA' | 'EARSIV' | 'EIRSALIYE';

export interface GibQueryInput {
  kind: GibKind;
  saticiVkn: string;
  aliciVkn?: string;
  belgeNo: string;
  odenecekTutar?: string;
  toplamTutar?: string;
  tarih?: string;
  fhash?: string;
}

export type GibStatus = 'OK' | 'NOT_FOUND' | 'REJECTED' | 'CANCELLED' | 'ERROR';

export interface GibResult {
  status: GibStatus;
  code: string;
  message: string;
  gibTime?: string;
  receiverTime?: string;
  extra?: string;
  raw?: string;
  checkedAt: string;
}

export const GIB_KIND_LABELS: Record<GibKind, string> = {
  EFATURA: 'e-Fatura',
  EARSIV: 'e-Arşiv Fatura',
  EIRSALIYE: 'e-İrsaliye',
};

const amount = (v?: string) => {
  if (!v) return '';
  const n = Number(String(v).replace(',', '.'));
  return Number.isNaN(n) ? v : n.toFixed(2);
};

/** Belgeden çıkarılan bilgilerle sorgu formunu doldurur. */
export function inputFromDocInfo(info: DocInfo): GibQueryInput {
  const kind: GibKind =
    info.docType === 'DespatchAdvice' ? 'EIRSALIYE' : info.profileId === 'EARSIVFATURA' ? 'EARSIV' : 'EFATURA';
  return {
    kind,
    saticiVkn: info.supplierId || '',
    aliciVkn: info.customerId || '',
    belgeNo: info.number || '',
    odenecekTutar: amount(info.payableAmount),
    toplamTutar: amount(info.lineExtensionAmount),
    tarih: info.issueDate || '',
    fhash: info.digestValue || '',
  };
}

export function canQuery(info: DocInfo): boolean {
  return (info.docType === 'Invoice' || info.docType === 'DespatchAdvice') && !!info.number && !!info.supplierId;
}

function buildParams(i: GibQueryInput): URLSearchParams {
  const p = new URLSearchParams();
  const no = i.belgeNo.trim().toUpperCase();
  if (i.kind === 'EIRSALIYE') {
    p.set('SATICIVKN', i.saticiVkn.trim());
    p.set('IRSNO', no);
    p.set('ZAMANYAZ', '');
    p.set('REPTYPE', 'EIRSDOGRULAMA');
  } else if (i.kind === 'EARSIV') {
    p.set('SATICIVKNTCKN', i.saticiVkn.trim());
    p.set('ALICIVKNTCKN', (i.aliciVkn || '').trim());
    p.set('FATNO', no);
    p.set('ODTUTAR', amount(i.odenecekTutar));
    p.set('TOPTUTAR', amount(i.toplamTutar));
    p.set('FATDUZTAR', (i.tarih || '').trim());
    p.set('REPTYPE', 'EARSVDOGRULAMA');
  } else {
    p.set('SATICIVKN', i.saticiVkn.trim());
    p.set('BIRIMKOD', no.substring(0, 3));
    p.set('SIRANO', no.substring(3));
    p.set('ODTUTAR', amount(i.odenecekTutar));
    p.set('FHASH', (i.fhash || '').trim());
    p.set('ZAMANYAZ', '');
    p.set('REPTYPE', 'EFTRDOGRULAMA');
  }
  return p;
}

/** YYYYMMDDHHMMSS → GG.AA.YYYY SS:DD:ss */
function fmtTs(ts?: string): string | undefined {
  if (!ts || !/^\d{14}/.test(ts)) return ts;
  return `${ts.slice(6, 8)}.${ts.slice(4, 6)}.${ts.slice(0, 4)} ${ts.slice(8, 10)}:${ts.slice(10, 12)}:${ts.slice(12, 14)}`;
}

/** GİB düz metin yanıtını yorumlar. Örn: "1 RECEIVE_TIME=20260101120000 SEND_TIME=..." */
export function parseGibResponse(raw: string, kind: GibKind): GibResult {
  const checkedAt = new Date().toISOString();
  const trimmed = (raw || '').trim();
  if (!trimmed) return { status: 'ERROR', code: '', message: 'GİB sunucusundan boş yanıt alındı.', raw, checkedAt };

  const tokens = trimmed.split(/\s+/);
  const code = tokens[0];
  const kv: Record<string, string> = {};
  for (const t of tokens.slice(1)) {
    const idx = t.indexOf('=');
    if (idx > 0) kv[t.slice(0, idx).toUpperCase()] = t.slice(idx + 1);
  }

  let status: GibStatus;
  let message: string;
  if (kind === 'EARSIV') {
    ({ status, message } = (
      {
        '1': { status: 'OK', message: 'e-Arşiv fatura GİB sisteminde kayıtlı (geçerli).' },
        '0': { status: 'NOT_FOUND', message: 'e-Arşiv fatura GİB sisteminde bulunamadı.' },
        '2': { status: 'CANCELLED', message: 'e-Arşiv fatura iptal edilmiş.' },
        '8': { status: 'ERROR', message: 'Satıcı VKN/TCKN bilgisi eşleşmedi.' },
      } as Record<string, { status: GibStatus; message: string }>
    )[code] || { status: 'ERROR', message: `Bilinmeyen GİB yanıt kodu: ${code}` });
  } else {
    const noun = kind === 'EIRSALIYE' ? 'İrsaliye' : 'Fatura';
    ({ status, message } = (
      {
        '1': { status: 'OK', message: `${noun} GİB'den geçmiş ve alıcıya ulaştırılmış.` },
        '0': { status: 'NOT_FOUND', message: `${noun} GİB sisteminde bulunamadı veya alıcıya ulaştırılmamış. (Bilgileri kontrol edin.)` },
        '2': { status: 'REJECTED', message: `${noun} GİB'den geçmiş, ancak alıcı tarafından reddedilmiş.` },
        '3': { status: 'CANCELLED', message: `${noun} GİB'den geçmiş ve iptal edilmiş.` },
      } as Record<string, { status: GibStatus; message: string }>
    )[code] || { status: 'ERROR', message: `Belgede hata var / bilinmeyen yanıt kodu: ${code}` });
  }

  let extra: string | undefined;
  const itiraz = kv['ITIRAZ_DURUM'];
  if (itiraz) {
    extra =
      ({ '1': 'Fatura itiraz nedeniyle iptal edildi.', '2': 'Satıcı itiraz talebi açtı.', '3': 'Alıcı itiraz talebi açtı.' } as Record<string, string>)[itiraz] ||
      `İtiraz durumu: ${itiraz}`;
  } else if (kv['RESPONSE_TIME']) {
    extra = `Alıcı yanıt zamanı: ${fmtTs(kv['RESPONSE_TIME'])}`;
  }

  return {
    status,
    code,
    message,
    gibTime: fmtTs(kv['RECEIVE_TIME'] || kv['GIB_TIME']),
    receiverTime: fmtTs(kv['SEND_TIME'] || kv['ALICI_TIME']),
    extra,
    raw: trimmed,
    checkedAt,
  };
}

declare global {
  interface Window {
    /** Electron preload köprüsü (electron/preload.ts). */
    gib?: { query: (query: string) => Promise<{ status: number; body: { ok: boolean; raw?: string; error?: string } }> };
  }
}

export async function queryGib(input: GibQueryInput): Promise<GibResult> {
  const params = buildParams(input);
  const fail = (code: string, message: string, raw?: string): GibResult => ({
    status: 'ERROR',
    code,
    message,
    raw,
    checkedAt: new Date().toISOString(),
  });
  if (!window.gib) return fail('NET', 'GİB sorgusu yalnızca masaüstü uygulamasında çalışır.');
  try {
    const { status, body } = await window.gib.query(params.toString());
    if (!body.ok) return fail(String(status), body.error || 'GİB sorgusu başarısız.', body.raw);
    return parseGibResponse(body.raw || '', input.kind);
  } catch (err) {
    return fail('NET', `GİB sorgusu yapılamadı: ${(err as Error).message}`);
  }
}

export const GIB_STATUS_LABELS: Record<GibStatus, string> = {
  OK: 'Geçerli',
  NOT_FOUND: 'Bulunamadı',
  REJECTED: 'Reddedildi',
  CANCELLED: 'İptal',
  ERROR: 'Hata',
};
