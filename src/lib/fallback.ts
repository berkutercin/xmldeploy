import type { UblDocType } from './envelope';
import { extractDocInfo, path, text, DOC_TYPE_LABELS, profileLabel } from './ubl';

/**
 * Gömülü XSLT bulunmadığında ya da dönüşüm başarısız olduğunda kullanılan sade A4 şablonu.
 * Ayrıntılı vergi kırılımı vs. hedeflenmez; belgenin okunabilir bir PDF'i alınabilmesi yeterlidir.
 */

const esc = (s: string | undefined | null) =>
  (s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const kids = (el: Element | undefined, name: string) =>
  el ? Array.from(el.children).filter((c) => c.localName === name) : [];

function fmtAmount(el: Element | undefined): string {
  const v = text(el);
  if (!v) return '';
  const n = Number(v);
  const cur = el?.getAttribute('currencyID') || '';
  if (Number.isNaN(n)) return esc(v);
  return `${n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${esc(cur)}`;
}

function fmtDate(d?: string): string {
  if (!d) return '';
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : d;
}

function partyBlock(title: string, party: Element | undefined): string {
  if (!party) return '';
  const name = text(path(party, 'PartyName', 'Name'));
  const person = kids(party, 'Person')[0];
  const personName = person
    ? [text(kids(person, 'FirstName')[0]), text(kids(person, 'FamilyName')[0])].filter(Boolean).join(' ')
    : '';
  const addr = kids(party, 'PostalAddress')[0];
  const addrLine = addr
    ? [
        text(kids(addr, 'StreetName')[0]),
        text(kids(addr, 'BuildingNumber')[0]),
        text(kids(addr, 'CitySubdivisionName')[0]),
        text(kids(addr, 'CityName')[0]),
        text(path(addr, 'Country', 'Name')),
      ]
        .filter(Boolean)
        .join(' ')
    : '';
  const taxOffice = text(path(party, 'PartyTaxScheme', 'TaxScheme', 'Name'));
  const ids = kids(party, 'PartyIdentification')
    .map((pi) => kids(pi, 'ID')[0])
    .filter(Boolean)
    .map((id) => `${esc(id!.getAttribute('schemeID') || 'ID')}: ${esc(text(id))}`)
    .join('<br>');
  return `
    <div class="party">
      <div class="party-title">${esc(title)}</div>
      <div class="party-name">${esc(name || personName)}</div>
      ${addrLine ? `<div>${esc(addrLine)}</div>` : ''}
      ${taxOffice ? `<div>Vergi Dairesi: ${esc(taxOffice)}</div>` : ''}
      ${ids ? `<div>${ids}</div>` : ''}
    </div>`;
}

function linesTable(root: Element, docType: UblDocType): string {
  const lineTag = docType === 'DespatchAdvice' ? 'DespatchLine' : docType === 'ReceiptAdvice' ? 'ReceiptLine' : docType === 'CreditNote' ? 'CreditNoteLine' : 'InvoiceLine';
  const lines = kids(root, lineTag);
  if (!lines.length) return '';
  const isDespatch = docType === 'DespatchAdvice' || docType === 'ReceiptAdvice';
  const rows = lines
    .map((ln, i) => {
      const qtyEl =
        kids(ln, 'InvoicedQuantity')[0] || kids(ln, 'DeliveredQuantity')[0] || kids(ln, 'ReceivedQuantity')[0] || kids(ln, 'CreditedQuantity')[0];
      const qty = text(qtyEl) || '';
      const unit = qtyEl?.getAttribute('unitCode') || '';
      const name = text(path(ln, 'Item', 'Name')) || text(path(ln, 'Item', 'Description')) || '';
      if (isDespatch) {
        return `<tr><td>${i + 1}</td><td>${esc(name)}</td><td class="r">${esc(qty)} ${esc(unit)}</td></tr>`;
      }
      const price = fmtAmount(path(ln, 'Price', 'PriceAmount'));
      const pct = text(path(ln, 'TaxTotal', 'TaxSubtotal', 'Percent'));
      const total = fmtAmount(kids(ln, 'LineExtensionAmount')[0]);
      return `<tr><td>${i + 1}</td><td>${esc(name)}</td><td class="r">${esc(qty)} ${esc(unit)}</td><td class="r">${price}</td><td class="r">${pct ? '%' + esc(pct) : ''}</td><td class="r">${total}</td></tr>`;
    })
    .join('');
  const head = isDespatch
    ? '<tr><th>#</th><th>Mal / Hizmet</th><th class="r">Miktar</th></tr>'
    : '<tr><th>#</th><th>Mal / Hizmet</th><th class="r">Miktar</th><th class="r">Birim Fiyat</th><th class="r">KDV</th><th class="r">Tutar</th></tr>';
  return `<table class="lines"><thead>${head}</thead><tbody>${rows}</tbody></table>`;
}

function totalsTable(root: Element): string {
  const t = kids(root, 'LegalMonetaryTotal')[0];
  if (!t) return '';
  const row = (label: string, el: Element | undefined, strong = false) =>
    el ? `<tr${strong ? ' class="strong"' : ''}><td>${label}</td><td class="r">${fmtAmount(el)}</td></tr>` : '';
  const taxTotal = kids(root, 'TaxTotal')[0];
  return `<table class="totals">
    ${row('Mal/Hizmet Toplam Tutarı', kids(t, 'LineExtensionAmount')[0])}
    ${row('Toplam İskonto', kids(t, 'AllowanceTotalAmount')[0])}
    ${row('Vergi Hariç Tutar', kids(t, 'TaxExclusiveAmount')[0])}
    ${row('Hesaplanan Vergiler', kids(taxTotal, 'TaxAmount')[0])}
    ${row('Vergiler Dahil Toplam', kids(t, 'TaxInclusiveAmount')[0])}
    ${row('Ödenecek Tutar', kids(t, 'PayableAmount')[0], true)}
  </table>`;
}

export function renderFallbackHtml(doc: Document, docType: UblDocType, notice?: string): string {
  const root = doc.documentElement;
  const info = extractDocInfo(doc, docType);
  const sup = docType === 'ApplicationResponse' ? path(root, 'SenderParty') : path(root, ...(docType === 'DespatchAdvice' || docType === 'ReceiptAdvice' ? ['DespatchSupplierParty', 'Party'] : ['AccountingSupplierParty', 'Party']));
  const cus = docType === 'ApplicationResponse' ? path(root, 'ReceiverParty') : path(root, ...(docType === 'DespatchAdvice' || docType === 'ReceiptAdvice' ? ['DeliveryCustomerParty', 'Party'] : ['AccountingCustomerParty', 'Party']));
  const notes = kids(root, 'Note').map((n) => text(n)).filter(Boolean);

  let responseBlock = '';
  if (docType === 'ApplicationResponse') {
    const resp = path(root, 'DocumentResponse', 'Response');
    const ref = path(root, 'DocumentResponse', 'DocumentReference');
    responseBlock = `<table class="info">
      <tr><th>Yanıt Kodu</th><td>${esc(text(kids(resp, 'ResponseCode')[0]))}</td></tr>
      <tr><th>Açıklama</th><td>${esc(text(kids(resp, 'Description')[0]))}</td></tr>
      <tr><th>İlgili Belge</th><td>${esc(text(kids(ref, 'ID')[0]))}</td></tr>
    </table>`;
  }

  return `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"><title>${esc(info.number)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #111; margin: 0; padding: 24px; background: #fff; width: 794px; }
  .top { display: flex; justify-content: space-between; gap: 16px; border-bottom: 3px solid #b91c1c; padding-bottom: 12px; margin-bottom: 14px; }
  .doc-title { font-size: 20px; font-weight: bold; color: #b91c1c; letter-spacing: 1px; }
  .party { flex: 1; border: 1px solid #ccc; padding: 8px 10px; margin-bottom: 8px; line-height: 1.5; }
  .party-title { font-size: 10px; text-transform: uppercase; color: #666; }
  .party-name { font-weight: bold; font-size: 12px; }
  .parties { display: flex; gap: 12px; }
  table { border-collapse: collapse; width: 100%; }
  table.info { width: auto; margin: 10px 0; }
  table.info th { text-align: left; padding: 3px 12px 3px 0; color: #444; font-weight: normal; }
  table.info td { padding: 3px 0; font-weight: bold; }
  table.lines { margin-top: 14px; }
  table.lines th { background: #f3f4f6; border: 1px solid #ccc; padding: 5px; text-align: left; }
  table.lines td { border: 1px solid #ddd; padding: 5px; vertical-align: top; }
  .r { text-align: right !important; white-space: nowrap; }
  table.totals { width: 340px; margin: 14px 0 0 auto; }
  table.totals td { border: 1px solid #ddd; padding: 5px 8px; }
  table.totals tr.strong td { font-weight: bold; background: #fef2f2; }
  .notes { margin-top: 16px; border-top: 1px solid #ddd; padding-top: 8px; line-height: 1.5; }
  .notice { margin-top: 18px; font-size: 9px; color: #888; }
</style></head><body>
  <div class="top">
    <div>
      <div class="doc-title">${esc(DOC_TYPE_LABELS[docType]).toLocaleUpperCase('tr-TR')}</div>
      <table class="info">
        <tr><th>Senaryo / Tür</th><td>${esc(profileLabel(info))}${info.typeCode ? ' / ' + esc(info.typeCode) : ''}</td></tr>
        <tr><th>Belge No</th><td>${esc(info.number)}</td></tr>
        <tr><th>Tarih</th><td>${esc(fmtDate(info.issueDate))} ${esc(info.issueTime?.slice(0, 8))}</td></tr>
        ${info.orderNumber ? `<tr><th>Sipariş No</th><td>${esc(info.orderNumber)}${info.orderDate ? ' (' + esc(fmtDate(info.orderDate)) + ')' : ''}</td></tr>` : ''}
        ${info.despatchNumber ? `<tr><th>İrsaliye No</th><td>${esc(info.despatchNumber)}${info.despatchDate ? ' (' + esc(fmtDate(info.despatchDate)) + ')' : ''}</td></tr>` : ''}
        <tr><th>ETTN</th><td>${esc(info.uuid)}</td></tr>
      </table>
    </div>
  </div>
  <div class="parties">
    ${partyBlock(docType === 'ApplicationResponse' ? 'Gönderen' : 'Satıcı / Gönderici', sup)}
    ${partyBlock(docType === 'ApplicationResponse' ? 'Alıcı' : 'Alıcı', cus)}
  </div>
  ${responseBlock}
  ${linesTable(root, docType)}
  ${totalsTable(root)}
  ${notes.length ? `<div class="notes"><b>Notlar:</b><br>${notes.map(esc).join('<br>')}</div>` : ''}
  <div class="notice">${esc(notice || 'Bu belgede gömülü görüntüleme şablonu (XSLT) bulunmadığı için standart şablon kullanılmıştır.')}</div>
</body></html>`;
}
