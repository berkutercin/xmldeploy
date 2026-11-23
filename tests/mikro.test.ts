import { describe, it, expect } from 'vitest';
import fs from 'fs';
import { parseInput } from '../src/lib/envelope';
import { extractDocInfo } from '../src/lib/ubl';
import { renderFallbackHtml } from '../src/lib/fallback';

describe('MikroDocument XML Support', () => {
  const filePath = 'c:\\Users\\berku\\Downloads\\mikrodocda417a88-55bf-4453-b5b5-e8b0459dadd7.xml';

  it('correctly parses and extracts documents from MikroDocument XML', () => {
    if (!fs.existsSync(filePath)) return;
    const text = fs.readFileSync(filePath, 'utf8');
    const parsed = parseInput(text);

    expect(parsed.kind).toBe('zarf');
    expect(parsed.documents.length).toBe(1);

    const docItem = parsed.documents[0];
    expect(docItem.docType).toBe('Invoice');

    const info = extractDocInfo(docItem.doc, 'Invoice');
    console.log('Extracted Mikro DocInfo:', info);

    expect(info.number).toBe('EFAB144');
    expect(info.issueDate).toBe('2026-11-06');
    expect(info.supplierName).toContain('BERATECH');
    expect(info.customerName).toContain('DEVLET MALZEME');
    expect(info.payableAmount).toBe('294805.61');

    expect(info.orderNumber).toBe('Y_K6287_18_0001');
    expect(info.orderDate).toBe('2026-11-04');
    expect(info.despatchNumber).toBe('IRS2026000000004');
    expect(info.despatchDate).toBe('2026-11-05');

    const html = renderFallbackHtml(docItem.doc, 'Invoice');
    expect(html).toContain('BERATECH');
    expect(html).toContain('CZUR ET28 Pro Kitap Tarayıcı');
    expect(html).toContain('EFAB144');
    expect(html).toContain('Y_K6287_18_0001');
    expect(html).toContain('IRS2026000000004');
  });
});
