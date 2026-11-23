/**
 * Zarf (StandardBusinessDocument) ve düz UBL-TR XML ayrıştırıcı.
 *
 * GİB Zarf yapısı:
 *   <sh:StandardBusinessDocument>
 *     <sh:StandardBusinessDocumentHeader> ... gönderici/alıcı etiketleri, zarf ETTN ... </sh:StandardBusinessDocumentHeader>
 *     <ef:Package>
 *       <Elements>
 *         <ElementType>INVOICE</ElementType>
 *         <ElementCount>2</ElementCount>
 *         <ElementList>
 *           <Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"> ... </Invoice>
 *           <Invoice ...> ... </Invoice>
 *         </ElementList>
 *       </Elements>
 *     </ef:Package>
 *   </sh:StandardBusinessDocument>
 *
 * GİB görüntüleyicisi kök elemanın Invoice olmasını beklediği için zarflar açılamaz.
 * Burada içteki her UBL belgesi, üst elemanlardaki namespace bildirimleri de taşınarak
 * kendi başına geçerli bir XML'e dönüştürülür.
 */

export const UBL_DOC_TYPES = ['Invoice', 'DespatchAdvice', 'ReceiptAdvice', 'CreditNote', 'ApplicationResponse'] as const;
export type UblDocType = (typeof UBL_DOC_TYPES)[number];

const UBL_NS_PREFIX = 'urn:oasis:names:specification:ubl:schema:xsd:';
const XMLNS_NS = 'http://www.w3.org/2000/xmlns/';

export interface EnvelopeInfo {
  instanceIdentifier?: string;
  type?: string;
  senderIdentifier?: string;
  receiverIdentifier?: string;
  creationDateAndTime?: string;
  elementTypes: string[];
}

export interface ExtractedDocument {
  docType: UblDocType;
  /** Tek başına geçerli UBL XML metni (GİB görüntüleyicide açılabilir) */
  xml: string;
  doc: Document;
}

export interface ParsedInput {
  kind: 'zarf' | 'ubl';
  envelope?: EnvelopeInfo;
  documents: ExtractedDocument[];
}

export class XmlInputError extends Error {}

export function parseXml(text: string): Document {
  if (/<!ENTITY/i.test(text)) {
    throw new XmlInputError('Güvenlik nedeniyle ENTITY tanımı içeren XML işlenmez.');
  }
  const cleaned = text.replace(/^\uFEFF/, '').replace(/<!DOCTYPE[^>]*>/i, '').trim();
  const doc = new DOMParser().parseFromString(cleaned, 'application/xml');
  const err = doc.getElementsByTagName('parsererror')[0];
  if (err) {
    const msg = (err.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 200);
    throw new XmlInputError(`XML okunamadı (bozuk/eksik dosya): ${msg}`);
  }
  return doc;
}

const isUblType = (name: string): name is UblDocType => (UBL_DOC_TYPES as readonly string[]).includes(name);

function isUblDocElement(el: Element): boolean {
  if (!isUblType(el.localName)) return false;
  const ns = el.namespaceURI || '';
  if (ns.startsWith(UBL_NS_PREFIX)) return true;

  // Namespace'siz ama ElementList veya ERP paketleri (MikroDocument, Invoices vb.) altında duran belgeler için tolerans
  const parentName = el.parentElement?.localName || '';
  if (['ElementList', 'Invoices', 'Documents', 'MikroDocument', 'Package', 'Envelope'].includes(parentName)) {
    return true;
  }

  // Karakteristik e-Belge alt etiketleri kontrolü (Mikro, Logo vb. özel XML'leri algılama)
  return Array.from(el.children).some((c) =>
    [
      'AccountingSupplierParty',
      'DespatchSupplierParty',
      'LegalMonetaryTotal',
      'InvoiceLine',
      'DespatchLine',
      'TransactionSerial',
      'UUID',
    ].includes(c.localName),
  );
}

function firstDescendantText(root: Element | Document, localName: string): string | undefined {
  const all = root.getElementsByTagName('*');
  for (let i = 0; i < all.length; i++) {
    if (all[i].localName === localName) {
      const t = all[i].textContent?.trim();
      if (t) return t;
    }
  }
  return undefined;
}

function childByLocalName(el: Element, localName: string): Element | undefined {
  for (const c of Array.from(el.children)) if (c.localName === localName) return c;
  return undefined;
}

function extractEnvelopeInfo(root: Element): EnvelopeInfo {
  const header = Array.from(root.children).find((c) => c.localName === 'StandardBusinessDocumentHeader');
  const info: EnvelopeInfo = { elementTypes: [] };
  if (header) {
    const sender = childByLocalName(header, 'Sender');
    const receiver = childByLocalName(header, 'Receiver');
    const ident = childByLocalName(header, 'DocumentIdentification');
    info.senderIdentifier = sender ? firstDescendantText(sender, 'Identifier') : undefined;
    info.receiverIdentifier = receiver ? firstDescendantText(receiver, 'Identifier') : undefined;
    if (ident) {
      info.instanceIdentifier = firstDescendantText(ident, 'InstanceIdentifier');
      info.type = firstDescendantText(ident, 'Type');
      info.creationDateAndTime = firstDescendantText(ident, 'CreationDateAndTime');
    }
  } else if (root.localName === 'MikroDocument') {
    info.type = 'MikroDocument';
    const ver = childByLocalName(root, 'Version')?.textContent?.trim();
    if (ver) info.instanceIdentifier = ver;
  }
  const all = root.getElementsByTagName('*');
  for (let i = 0; i < all.length; i++) {
    if (all[i].localName === 'ElementType') {
      const t = all[i].textContent?.trim();
      if (t) info.elementTypes.push(t);
    }
  }
  return info;
}

/** Elemanı, üst elemanlardaki namespace bildirimlerini de alarak bağımsız XML metnine çevirir. */
export function toStandaloneXml(el: Element): string {
  const clone = el.cloneNode(true) as Element;
  let p: Element | null = el.parentElement;
  while (p) {
    for (const attr of Array.from(p.attributes)) {
      const isNsDecl = attr.name === 'xmlns' || attr.name.startsWith('xmlns:');
      if (!isNsDecl || clone.hasAttribute(attr.name)) continue;
      // Varsayılan namespace: sadece eleman onu gerçekten miras alıyorsa taşı
      if (attr.name === 'xmlns' && attr.value !== (el.namespaceURI || '')) continue;
      clone.setAttributeNS(XMLNS_NS, attr.name, attr.value);
    }
    p = p.parentElement;
  }

  // UBL varsayılan namespace yoksa ekle (GİB görüntüleyicisi ve standart araçların açabilmesi için)
  if (!clone.getAttribute('xmlns')) {
    const defaultNs = `${UBL_NS_PREFIX}${clone.localName}-2`;
    clone.setAttribute('xmlns', defaultNs);
  }

  // Eğer ID etiketi yoksa ancak TransactionSerial / TransactionNumber varsa resmi UBL <ID> olarak üret
  const hasId = Array.from(clone.children).some((c) => c.localName === 'ID');
  if (!hasId) {
    const serial = Array.from(clone.children).find((c) => c.localName === 'TransactionSerial')?.textContent?.trim() || '';
    const num = Array.from(clone.children).find((c) => c.localName === 'TransactionNumber')?.textContent?.trim() || '';
    if (serial || num) {
      const idEl = clone.ownerDocument.createElement('ID');
      idEl.textContent = `${serial}${num}`;
      const uuidEl = Array.from(clone.children).find((c) => c.localName === 'UUID');
      if (uuidEl && uuidEl.nextSibling) {
        clone.insertBefore(idEl, uuidEl.nextSibling);
      } else {
        clone.insertBefore(idEl, clone.firstChild);
      }
    }
  }

  // Eğer IssueDate yoksa fakat DocumentDate varsa <IssueDate> olarak ekle
  const hasDate = Array.from(clone.children).some((c) => c.localName === 'IssueDate');
  if (!hasDate) {
    const docDate = Array.from(clone.children).find((c) => c.localName === 'DocumentDate')?.textContent?.trim();
    if (docDate) {
      const dateEl = clone.ownerDocument.createElement('IssueDate');
      dateEl.textContent = docDate;
      const idEl = Array.from(clone.children).find((c) => c.localName === 'ID');
      if (idEl && idEl.nextSibling) {
        clone.insertBefore(dateEl, idEl.nextSibling);
      } else {
        clone.appendChild(dateEl);
      }
    }
  }

  // Eğer IssueTime yoksa fakat DocumentTime varsa <IssueTime> olarak ekle
  const hasTime = Array.from(clone.children).some((c) => c.localName === 'IssueTime');
  if (!hasTime) {
    const docTime = Array.from(clone.children).find((c) => c.localName === 'DocumentTime')?.textContent?.trim();
    if (docTime) {
      const timeEl = clone.ownerDocument.createElement('IssueTime');
      const m = docTime.match(/^(\d{2}:\d{2}(?::\d{2})?)/);
      timeEl.textContent = m ? m[1] : docTime;
      const dateEl = Array.from(clone.children).find((c) => c.localName === 'IssueDate');
      if (dateEl && dateEl.nextSibling) {
        clone.insertBefore(timeEl, dateEl.nextSibling);
      } else {
        clone.appendChild(timeEl);
      }
    }
  }

  const body = new XMLSerializer().serializeToString(clone);
  return `<?xml version="1.0" encoding="UTF-8"?>\n${body}`;
}

/** Bir XML metnini analiz eder: düz UBL belgesi mi, zarf mı? İçindeki belgeleri döndürür. */
export function parseInput(text: string): ParsedInput {
  const doc = parseXml(text);
  const root = doc.documentElement;

  if (isUblDocElement(root)) {
    return {
      kind: 'ubl',
      documents: [{ docType: root.localName as UblDocType, xml: text, doc }],
    };
  }

  const isEnvelope =
    root.localName === 'StandardBusinessDocument' ||
    root.localName === 'Package' ||
    root.localName === 'Envelope' ||
    root.localName === 'MikroDocument' ||
    root.localName === 'Invoices';

  // Kökten başlayarak UBL belgelerini bul (iç içe olanları — ör. ek belge — atla)
  const found: Element[] = [];
  const walk = (el: Element) => {
    for (const child of Array.from(el.children)) {
      if (isUblDocElement(child)) found.push(child);
      else walk(child);
    }
  };
  walk(root);

  if (found.length === 0) {
    throw new XmlInputError(
      isEnvelope
        ? 'Zarf / Paket içinde dönüştürülebilir belge (Invoice / DespatchAdvice vb.) bulunamadı.'
        : `Desteklenmeyen XML türü (kök eleman: <${root.localName}>).`,
    );
  }

  const documents: ExtractedDocument[] = found.map((el) => {
    const xml = toStandaloneXml(el);
    return { docType: el.localName as UblDocType, xml, doc: parseXml(xml) };
  });

  return {
    kind: 'zarf',
    envelope: extractEnvelopeInfo(root),
    documents,
  };
}
