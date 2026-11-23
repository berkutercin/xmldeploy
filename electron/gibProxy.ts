import https from 'node:https';

/**
 * GİB e-Belge sorgu servisi için ince (thin) proxy çekirdeği.
 *
 * GİB sunucusu (sorgu.efatura.gov.tr), eski Tomcat/Apache arkasında çalışır ve
 * 'Content-Length: 1           ' veya 'Content-Length: 83      ' şeklinde sonuna boşluk eklenmiş
 * hatalı HTTP başlıkları döner.
 *
 * Standart `fetch` / V8 Edge HTTP ayrıştırıcıları bu boşlukları RFC ihlali sayarak
 * "invalid Content-Length header value" hatası fırlatır.
 *
 * Bu nedenle Node.js'in yerleşik `https.request` modülü ve `insecureHTTPParser: true`
 * seçeneği kullanılır.
 */

export const GIB_ENDPOINT = 'https://sorgu.efatura.gov.tr/eFaturaSrg/efaturasrg';

const ALLOWED_REPTYPES = new Set(['EFTRDOGRULAMA', 'EARSVDOGRULAMA', 'EIRSDOGRULAMA']);

const ALLOWED_KEYS = new Set([
  'REPTYPE',
  'SATICIVKN',
  'SATICIVKNTCKN',
  'ALICIVKNTCKN',
  'BIRIMKOD',
  'SIRANO',
  'FATNO',
  'IRSNO',
  'ODTUTAR',
  'TOPTUTAR',
  'FATDUZTAR',
  'FHASH',
  'ZAMANYAZ',
]);

export interface GibProxyResult {
  status: number;
  body: { ok: boolean; raw?: string; error?: string };
}

export async function proxyGibQuery(search: URLSearchParams, timeoutMs = 15000): Promise<GibProxyResult> {
  const repType = search.get('REPTYPE') || '';
  if (!ALLOWED_REPTYPES.has(repType)) {
    return { status: 400, body: { ok: false, error: 'Geçersiz REPTYPE.' } };
  }

  const out = new URLSearchParams();
  for (const [key, value] of search.entries()) {
    const k = key.toUpperCase();
    if (!ALLOWED_KEYS.has(k)) continue;
    if (value.length > 200) {
      return { status: 400, body: { ok: false, error: `${k} parametresi çok uzun.` } };
    }
    out.set(k, value);
  }

  const targetUrl = `${GIB_ENDPOINT}?${out.toString()}`;

  return new Promise<GibProxyResult>((resolve) => {
    const req = https.get(
      targetUrl,
      {
        insecureHTTPParser: true,
        timeout: timeoutMs,
        headers: {
          Accept: 'text/html, text/plain, */*',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      },
      (res) => {
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 400) {
            resolve({
              status: 502,
              body: { ok: false, error: `GİB HTTP ${res.statusCode}`, raw },
            });
          } else {
            resolve({
              status: 200,
              body: { ok: true, raw },
            });
          }
        });
      }
    );

    req.on('timeout', () => {
      req.destroy();
      resolve({
        status: 504,
        body: { ok: false, error: 'GİB sunucusu zaman aşımına uğradı.' },
      });
    });

    req.on('error', (err) => {
      resolve({
        status: 504,
        body: { ok: false, error: `GİB bağlantı hatası: ${err.message}` },
      });
    });
  });
}
