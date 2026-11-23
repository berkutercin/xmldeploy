import { parseXml, type UblDocType } from './envelope';
import { findEmbeddedXslt, transformWithXslt } from './xslt';
import { renderFallbackHtml } from './fallback';

export interface RenderResult {
  html: string;
  source: 'xslt' | 'fallback';
  warning?: string;
}

const EXTRA_CSS = `<style data-zarfpdf>
  @page { size: A4; margin: 8mm; }
  html, body {
    background: #ffffff !important;
    margin: 0 auto !important;
    box-sizing: border-box !important;
    max-width: 900px !important;
  }
  @media print {
    body {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  }
  img { max-width: 100%; }
  table {
    max-width: 100% !important;
    box-sizing: border-box !important;
  }
  table td, table th {
    vertical-align: middle !important;
    line-height: 1.35 !important;
  }
  div[style*="2147483647"], div[style*="#d93829"] {
    display: none !important;
  }
</style>`;

function injectHead(html: string): string {
  const meta = '<meta charset="utf-8">';
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head([^>]*)>/i, `<head$1>${meta}${EXTRA_CSS}`);
  if (/<html[^>]*>/i.test(html)) return html.replace(/<html([^>]*)>/i, `<html$1><head>${meta}${EXTRA_CSS}</head>`);
  return `<!DOCTYPE html><html><head>${meta}${EXTRA_CSS}</head><body>${html}</body></html>`;
}

/** UBL XML'i görüntülenebilir HTML'e çevirir: önce gömülü XSLT, olmazsa standart şablon. */
export async function renderDocument(xml: string, docType: UblDocType): Promise<RenderResult> {
  const doc = parseXml(xml);
  const xslt = findEmbeddedXslt(doc);

  if (xslt) {
    try {
      const html = await transformWithXslt(doc, xslt);
      return { html: injectHead(html), source: 'xslt' };
    } catch (err) {
      const warning = `Gömülü XSLT uygulanamadı (${(err as Error).message}); standart şablon kullanıldı.`;
      return { html: injectHead(renderFallbackHtml(doc, docType, warning)), source: 'fallback', warning };
    }
  }

  return { html: injectHead(renderFallbackHtml(doc, docType)), source: 'fallback' };
}
