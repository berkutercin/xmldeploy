import polyfillUrl from 'xslt-polyfill/xslt-polyfill.min.js?url';

/**
 * Faturaya gömülü XSLT şablonunu bulur ve XML'i HTML'e dönüştürür.
 *
 * NOT: Chrome, yerleşik XSLTProcessor desteğini 17 Kasım 2026'da (Chrome 158) kaldırıyor.
 * Tarayıcıda yerleşik destek yoksa (veya ?polyfill=1 ile zorlanırsa) Google'ın resmi
 * WASM tabanlı `xslt-polyfill` paketi (libxslt) tembel yüklenir.
 */

declare global {
  interface Window {
    xsltUsePolyfillOnlyIfNeeded?: boolean;
    xsltDontAutoloadXmlDocs?: boolean;
    xsltPolyfillReady?: () => Promise<void>;
  }
}

let processorReady: Promise<void> | null = null;

function nativeXsltWorks(): boolean {
  try {
    if (typeof window.XSLTProcessor !== 'function') return false;
    new window.XSLTProcessor();
    return true;
  } catch {
    return false;
  }
}

export function forcePolyfillRequested(): boolean {
  return new URLSearchParams(window.location.search).get('polyfill') === '1';
}

export let usingPolyfill = false;

/** XSLTProcessor'ın kullanılabilir olmasını garanti eder. */
export function ensureXsltProcessor(): Promise<void> {
  if (processorReady) return processorReady;
  const force = forcePolyfillRequested();
  if (!force && nativeXsltWorks()) {
    processorReady = Promise.resolve();
    return processorReady;
  }
  processorReady = new Promise<void>((resolve, reject) => {
    window.xsltUsePolyfillOnlyIfNeeded = !force;
    window.xsltDontAutoloadXmlDocs = true;
    const s = document.createElement('script');
    s.src = polyfillUrl;
    s.charset = 'utf-8';
    s.onload = async () => {
      try {
        if (typeof window.xsltPolyfillReady === 'function') await window.xsltPolyfillReady();
        usingPolyfill = true;
        resolve();
      } catch (e) {
        reject(e);
      }
    };
    s.onerror = () => reject(new Error('XSLT motoru (polyfill) yüklenemedi.'));
    document.head.appendChild(s);
  });
  processorReady.catch(() => {
    processorReady = null;
  });
  return processorReady;
}

/** Base64 → UTF-8 metin (Türkçe karakterler korunur). */
export function decodeBase64Utf8(b64: string): string {
  const bin = atob(b64.replace(/\s/g, ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  // UTF-8 BOM'u temizle
  const start = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? 3 : 0;
  return new TextDecoder('utf-8').decode(bytes.subarray(start));
}

const looksLikeXslt = (s: string) =>
  s.includes('http://www.w3.org/1999/XSL/Transform') || /<xsl:(stylesheet|transform)\b/.test(s);

/** Belgedeki AdditionalDocumentReference/EmbeddedDocumentBinaryObject alanlarından XSLT'yi bulur. */
export function findEmbeddedXslt(doc: Document): string | null {
  const all = doc.getElementsByTagName('*');
  const candidates: Element[] = [];
  for (let i = 0; i < all.length; i++) {
    if (all[i].localName === 'EmbeddedDocumentBinaryObject') candidates.push(all[i]);
  }
  // Dosya adı .xslt/.xsl olanları öne al
  candidates.sort((a, b) => score(b) - score(a));
  for (const el of candidates) {
    const raw = (el.textContent || '').replace(/\s/g, '');
    if (raw.length < 100) continue;
    try {
      const decoded = decodeBase64Utf8(raw);
      if (looksLikeXslt(decoded)) return decoded;
    } catch {
      /* base64 değil, sıradakine geç */
    }
  }
  return null;
}

function score(el: Element): number {
  const fn = (el.getAttribute('filename') || '').toLowerCase();
  return fn.endsWith('.xslt') || fn.endsWith('.xsl') ? 1 : 0;
}

const VOID_SAFE_TAGS = 'div|span|td|th|tr|table|tbody|thead|p|a|b|i|u|font|center|script|textarea|title|style|li|ul|ol|label|h[1-6]';

/** XMLSerializer çıktısındaki XHTML kalıntılarını HTML parser için düzeltir. */
export function fixSerializedHtml(html: string): string {
  const unescape = (c: string) =>
    c.replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  return html
    .replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, (_, a, c) => `<style${a}>${unescape(c)}</style>`)
    .replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (_, a, c) => `<script${a}>${unescape(c)}</script>`)
    .replace(new RegExp(`<(${VOID_SAFE_TAGS})(\\s[^<>]*?)?\\s*/>`, 'gi'), (_, t, a = '') => `<${t}${a}></${t}>`);
}

/** XML + XSLT → tam HTML belgesi (metin). */
export async function transformWithXslt(xmlDoc: Document, xsltText: string): Promise<string> {
  await ensureXsltProcessor();

  const xsltDoc = new DOMParser().parseFromString(xsltText.replace(/^\uFEFF/, ''), 'application/xml');
  if (xsltDoc.getElementsByTagName('parsererror').length) {
    throw new Error('Gömülü XSLT şablonu bozuk.');
  }

  const proc = new XSLTProcessor();
  proc.importStylesheet(xsltDoc);
  const out = proc.transformToDocument(xmlDoc);
  if (!out || !out.documentElement) throw new Error('XSLT dönüşümü boş sonuç döndürdü.');

  // Chrome yerleşik XSLTProcessor'ın enjekte ettiği 'This site uses XSLT' uyarısını temizle
  try {
    const warnings = out.querySelectorAll('div');
    for (let i = 0; i < warnings.length; i++) {
      const w = warnings[i];
      if (w.textContent && w.textContent.includes('This site uses XSLT')) {
        w.remove();
      }
    }
  } catch {}

  const rootEl = out.documentElement;
  const isHtmlDoc = out.contentType === 'text/html' || out instanceof HTMLDocument;
  let html = isHtmlDoc
    ? `<!DOCTYPE html>\n${rootEl.outerHTML}`
    : fixSerializedHtml(new XMLSerializer().serializeToString(out));

  html = html.replace(/<div[^>]*>This site uses XSLT;[\s\S]*?<\/div>/gi, '');

  if (rootEl.localName === 'transformiix' || rootEl.localName === 'parsererror') {
    throw new Error('XSLT dönüşümü başarısız.');
  }
  return html;
}
