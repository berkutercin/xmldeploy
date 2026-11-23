/**
 * Önizleme çerçevesi ve PDF köprüsü. PDF'in kendisi ana süreçte basılır (electron/pdfRenderer.ts).
 */

const sleep = (ms: number): Promise<void> => new Promise<void>((r) => setTimeout(r, ms));

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | void> {
  return Promise.race<T | void>([p, sleep(ms)]);
}

/** HTML'i verilen iframe'e yazar ve görseller/scriptler (ör. QR kod) hazır olana kadar bekler. */
export async function writeToFrame(iframe: HTMLIFrameElement, html: string): Promise<Document> {
  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) throw new Error('Önizleme çerçevesi oluşturulamadı.');

  const loaded = new Promise<void>((resolve) => win.addEventListener('load', () => resolve(), { once: true }));
  doc.open();
  doc.write(html);
  doc.close();
  if (doc.readyState !== 'complete') await withTimeout(loaded, 4000);

  const images = Array.from(doc.images).filter((img) => !img.complete);
  await withTimeout(
    Promise.all(images.map((img) => new Promise((r) => { img.onload = img.onerror = r; }))),
    4000,
  );
  if (doc.fonts?.ready) await withTimeout(doc.fonts.ready, 2000);
  await sleep(250); // QR kod vb. üreten scriptlere süre tanı
  return doc;
}

declare global {
  interface Window {
    /** Electron preload köprüsü: PDF ana süreçte, yazdırma motoruyla üretilir (electron/pdfRenderer.ts). */
    pdf?: { render: (html: string) => Promise<Uint8Array<ArrayBuffer>> };
  }
}

/** Tam HTML belgesini PDF Blob'una çevirir; yalnız masaüstü uygulamasında çalışır. */
export async function htmlToPdf(html: string): Promise<Blob> {
  if (!window.pdf) throw new Error('PDF yalnızca masaüstü uygulamasında üretilir.');
  return new Blob([await window.pdf.render(html)], { type: 'application/pdf' });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
