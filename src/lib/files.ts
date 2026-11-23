import JSZip from 'jszip';

export interface SourceFile {
  /** Görüntülenecek dosya adı (ZIP içindeyse "arsiv.zip/klasor/fatura.xml") */
  name: string;
  text: string;
}

/**
 * XML byte dizisini doğru karakter kodlamasıyla metne çevirir.
 * BOM ve <?xml encoding="..."?> bildirimini dikkate alır (ör. windows-1254, ISO-8859-9).
 */
export function decodeXmlBytes(bytes: Uint8Array): string {
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder('utf-8').decode(bytes.subarray(3));
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(bytes.subarray(2));
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder('utf-16be').decode(bytes.subarray(2));
  }

  const head = new TextDecoder('latin1').decode(bytes.subarray(0, 200));
  const m = head.match(/<\?xml[^>]*encoding\s*=\s*["']([^"']+)["']/i);
  const declared = m?.[1]?.toLowerCase();
  if (declared && declared !== 'utf-8' && declared !== 'utf8') {
    try {
      return new TextDecoder(declared).decode(bytes);
    } catch {
      /* desteklenmeyen kodlama: UTF-8 ile devam */
    }
  }
  return new TextDecoder('utf-8').decode(bytes);
}

const isXmlName = (n: string) => n.toLowerCase().endsWith('.xml');
const isZipName = (n: string) => n.toLowerCase().endsWith('.zip');

/** Seçilen/bırakılan dosyaları okur; ZIP arşivlerini açıp içindeki XML'leri de döndürür. */
export async function readInputFiles(files: File[]): Promise<{ sources: SourceFile[]; skipped: string[] }> {
  const sources: SourceFile[] = [];
  const skipped: string[] = [];

  for (const file of files) {
    try {
      if (isZipName(file.name)) {
        const zip = await JSZip.loadAsync(await file.arrayBuffer());
        const entries = Object.values(zip.files).filter((e) => !e.dir && isXmlName(e.name));
        if (entries.length === 0) skipped.push(`${file.name} (içinde XML yok)`);
        for (const entry of entries) {
          const bytes = await entry.async('uint8array');
          sources.push({ name: `${file.name}/${entry.name}`, text: decodeXmlBytes(bytes) });
        }
      } else if (isXmlName(file.name) || file.type.includes('xml')) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        sources.push({ name: file.name, text: decodeXmlBytes(bytes) });
      } else {
        skipped.push(file.name);
      }
    } catch (err) {
      skipped.push(`${file.name} (${(err as Error).message})`);
    }
  }

  return { sources, skipped };
}
