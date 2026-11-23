import type { UblDocType } from './envelope';

/** Dönüştürme listesi ve GİB sorgusu için gereken minimum belge bilgisi. */
export interface DocInfo {
  docType: UblDocType;
  profileId?: string;
  typeCode?: string;
  number?: string;
  uuid?: string;
  issueDate?: string;
  issueTime?: string;
  supplierName?: string;
  supplierId?: string;
  customerName?: string;
  customerId?: string;
  payableAmount?: string;
  lineExtensionAmount?: string;
  taxExclusiveAmount?: string;
  taxAmount?: string;
  currency?: string;
  orderNumber?: string;
  orderDate?: string;
  despatchNumber?: string;
  despatchDate?: string;
  /** XMLDSig <Reference URI=""> DigestValue — GİB e-Fatura doğrulamasında FHASH olarak kullanılır */
  digestValue?: string;
}

const kids = (el: Element | null | undefined, name: string): Element[] =>
  el ? Array.from(el.children).filter((c) => c.localName === name) : [];

const kid = (el: Element | null | undefined, name: string): Element | undefined => kids(el, name)[0];

/** Yol boyunca doğrudan çocukları takip eder: path(root, 'cac:LegalMonetaryTotal', 'PayableAmount') */
export function path(el: Element | null | undefined, ...names: string[]): Element | undefined {
  let cur: Element | undefined = el ?? undefined;
  for (const n of names) {
    cur = kid(cur, n);
    if (!cur) return undefined;
  }
  return cur;
}

export const text = (el: Element | null | undefined): string | undefined => el?.textContent?.trim() || undefined;

function partyName(party: Element | undefined): string | undefined {
  if (!party) return undefined;
  const name = text(path(party, 'PartyName', 'Name'));
  if (name) return name;
  const person = kid(party, 'Person');
  const full = [text(kid(person, 'FirstName')), text(kid(person, 'MiddleName')), text(kid(person, 'FamilyName'))]
    .filter(Boolean)
    .join(' ');
  return full || undefined;
}

function partyId(party: Element | undefined): string | undefined {
  if (!party) return undefined;
  const ids = kids(party, 'PartyIdentification').map((pi) => kid(pi, 'ID')).filter(Boolean) as Element[];
  const preferred = ids.find((id) => /^(VKN|TCKN)$/i.test(id.getAttribute('schemeID') || ''));
  return text(preferred) || undefined;
}

function findDigestValue(doc: Document): string | undefined {
  const refs = doc.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'Reference');
  let fallback: string | undefined;
  for (let i = 0; i < refs.length; i++) {
    const dv = text(kid(refs[i], 'DigestValue'));
    if (!dv) continue;
    if (refs[i].getAttribute('URI') === '') return dv;
    fallback ??= dv;
  }
  return fallback;
}

const PARTY_PATHS: Record<UblDocType, { supplier: string[]; customer: string[] }> = {
  Invoice: { supplier: ['AccountingSupplierParty', 'Party'], customer: ['AccountingCustomerParty', 'Party'] },
  CreditNote: { supplier: ['AccountingSupplierParty', 'Party'], customer: ['AccountingCustomerParty', 'Party'] },
  DespatchAdvice: { supplier: ['DespatchSupplierParty', 'Party'], customer: ['DeliveryCustomerParty', 'Party'] },
  ReceiptAdvice: { supplier: ['DespatchSupplierParty', 'Party'], customer: ['DeliveryCustomerParty', 'Party'] },
  ApplicationResponse: { supplier: ['SenderParty'], customer: ['ReceiverParty'] },
};

export function extractDocInfo(doc: Document, docType: UblDocType): DocInfo {
  const root = doc.documentElement;
  const paths = PARTY_PATHS[docType];
  const supplier = path(root, ...paths.supplier);
  const customer = path(root, ...paths.customer);
  const totals = kid(root, 'LegalMonetaryTotal');
  const payable = kid(totals, 'PayableAmount');

  const serial = text(kid(root, 'TransactionSerial')) || '';
  const num = text(kid(root, 'TransactionNumber')) || '';
  const fallbackNumber = serial || num ? `${serial}${num}` : undefined;

  const docDate = text(kid(root, 'IssueDate')) || text(kid(root, 'DocumentDate')) || text(kid(root, 'TransactionDate'));
  const rawTime = text(kid(root, 'IssueTime')) || text(kid(root, 'DocumentTime'));
  const docTime = rawTime?.match(/^(\d{2}:\d{2}(?::\d{2})?)/)?.[1] || rawTime;

  const orderRef = kid(root, 'OrderReference');
  const despatchRef = kid(root, 'DespatchDocumentReference');

  return {
    docType,
    profileId: text(kid(root, 'ProfileID')),
    typeCode: text(kid(root, 'InvoiceTypeCode')) || text(kid(root, 'DespatchAdviceTypeCode')),
    number: text(kid(root, 'ID')) || fallbackNumber,
    uuid: text(kid(root, 'UUID')),
    issueDate: docDate,
    issueTime: docTime,
    supplierName: partyName(supplier),
    supplierId: partyId(supplier),
    customerName: partyName(customer),
    customerId: partyId(customer),
    payableAmount: text(payable),
    lineExtensionAmount: text(kid(totals, 'LineExtensionAmount')),
    taxExclusiveAmount: text(kid(totals, 'TaxExclusiveAmount')),
    taxAmount: text(path(root, 'TaxTotal', 'TaxAmount')),
    currency: payable?.getAttribute('currencyID') || text(kid(root, 'DocumentCurrencyCode')),
    orderNumber: text(kid(orderRef, 'ID')),
    orderDate: text(kid(orderRef, 'IssueDate')),
    despatchNumber: text(kid(despatchRef, 'ID')),
    despatchDate: text(kid(despatchRef, 'IssueDate')),
    digestValue: findDigestValue(doc),
  };
}

export const DOC_TYPE_LABELS: Record<UblDocType, string> = {
  Invoice: 'Fatura',
  CreditNote: 'Fatura (İade)',
  DespatchAdvice: 'e-İrsaliye',
  ReceiptAdvice: 'İrsaliye Yanıtı',
  ApplicationResponse: 'Uygulama Yanıtı',
};

export function profileLabel(info: DocInfo): string {
  if (info.docType !== 'Invoice') return DOC_TYPE_LABELS[info.docType];
  if (info.profileId === 'EARSIVFATURA') return 'e-Arşiv';
  if (info.profileId) return `e-Fatura (${info.profileId})`;
  return 'Fatura';
}

/** Windows'ta geçerli, okunabilir PDF dosya adı üretir: FATURANO_FIRMA.pdf */
export function suggestFileBase(info: DocInfo, fallback: string): string {
  const parts = [info.number, info.supplierName].filter(Boolean) as string[];
  const base = parts.length ? parts.join('_') : fallback.replace(/\.xml$/i, '');
  return base
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'belge';
}
