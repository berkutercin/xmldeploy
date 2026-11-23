import JSZip from 'jszip';
import { readInputFiles } from './files';
import { parseInput, type UblDocType } from './envelope';
import { extractDocInfo, suggestFileBase, type DocInfo } from './ubl';
import { renderDocument } from './render';
import { htmlToPdf } from './pdf';

export interface DocItem {
  id: string;
  source: string;
  fromZarf: boolean;
  zarfInstanceId?: string;
  indexInSource: number;
  countInSource: number;
  docType: UblDocType;
  xml: string;
  info: DocInfo;
}

export interface FailedSource {
  source: string;
  error: string;
}

let seq = 0;
const nextId = () => `d${Date.now().toString(36)}${(seq++).toString(36)}`;
const yieldToUi = () => new Promise((r) => setTimeout(r, 0));

/** Dosyaları okur, zarfları açar ve her belge için liste öğesi üretir. */
export async function loadDocuments(
  files: File[],
  onProgress?: (done: number, total: number) => void,
): Promise<{ items: DocItem[]; failed: FailedSource[] }> {
  const { sources, skipped } = await readInputFiles(files);
  const items: DocItem[] = [];
  const failed: FailedSource[] = skipped.map((s) => ({ source: s, error: 'XML veya ZIP dosyası değil.' }));

  for (let i = 0; i < sources.length; i++) {
    const src = sources[i];
    try {
      const parsed = parseInput(src.text);
      parsed.documents.forEach((d, idx) => {
        items.push({
          id: nextId(),
          source: src.name,
          fromZarf: parsed.kind === 'zarf',
          zarfInstanceId: parsed.envelope?.instanceIdentifier,
          indexInSource: idx,
          countInSource: parsed.documents.length,
          docType: d.docType,
          xml: d.xml,
          info: extractDocInfo(d.doc, d.docType),
        });
      });
    } catch (err) {
      failed.push({ source: src.name, error: (err as Error).message });
    }
    if (i % 10 === 9) {
      onProgress?.(i + 1, sources.length);
      await yieldToUi();
    }
  }
  onProgress?.(sources.length, sources.length);
  return { items, failed };
}

export function baseName(item: DocItem): string {
  const fileOnly = item.source.split('/').pop() || 'belge';
  return suggestFileBase(item.info, fileOnly);
}

/** Aynı adlı dosyalar üst üste yazılmasın diye "(2)", "(3)" ekler. */
export function uniqueNamer() {
  const used = new Map<string, number>();
  return (name: string, ext: string) => {
    const key = `${name}.${ext}`.toLocaleLowerCase('tr-TR');
    const n = (used.get(key) || 0) + 1;
    used.set(key, n);
    return n === 1 ? `${name}.${ext}` : `${name} (${n}).${ext}`;
  };
}

export async function itemToPdf(item: DocItem): Promise<{ blob: Blob; warning?: string }> {
  const r = await renderDocument(item.xml, item.docType);
  const blob = await htmlToPdf(r.html);
  return { blob, warning: r.warning };
}

export interface BatchProgress {
  done: number;
  total: number;
  failed: number;
  current?: string;
}

/** Tüm belgeleri sırayla PDF'e çevirip tek ZIP üretir. */
export async function convertAllToZip(
  items: DocItem[],
  onProgress: (p: BatchProgress) => void,
  isCancelled: () => boolean,
): Promise<{ zip: Blob; failed: number; cancelled: boolean }> {
  const zip = new JSZip();
  const name = uniqueNamer();
  const errors: string[] = [];
  let done = 0;

  for (const item of items) {
    if (isCancelled()) break;
    const base = baseName(item);
    onProgress({ done, total: items.length, failed: errors.length, current: base });
    try {
      const { blob, warning } = await itemToPdf(item);
      zip.file(name(base, 'pdf'), blob);
      if (warning) errors.push(`[UYARI] ${item.source} → ${base}: ${warning}`);
    } catch (err) {
      errors.push(`[HATA] ${item.source} → ${base}: ${(err as Error).message}`);
    }
    done++;
    await yieldToUi();
  }

  const failedCount = errors.filter((e) => e.startsWith('[HATA]')).length;
  if (errors.length) zip.file('_RAPOR.txt', errors.join('\r\n'));
  onProgress({ done, total: items.length, failed: failedCount, current: 'ZIP hazırlanıyor…' });
  // PDF'ler zaten sıkıştırılmış; yeniden sıkıştırmak yalnızca arayüzü yorar.
  const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
  return { zip: blob, failed: failedCount, cancelled: isCancelled() };
}

/** Zarflardan çıkarılan saf UBL XML'leri ZIP'ler (GİB görüntüleyicide açılabilir). */
export async function extractedXmlsToZip(items: DocItem[]): Promise<Blob> {
  const zip = new JSZip();
  const name = uniqueNamer();
  for (const item of items) zip.file(name(baseName(item), 'xml'), item.xml);
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

export function timestamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}
