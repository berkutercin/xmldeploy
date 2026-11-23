import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseInput } from '../src/lib/envelope';
import { extractDocInfo } from '../src/lib/ubl';

// Yalnızca uydurma veri: gerçek fatura (VKN, IBAN, ad) bu klasöre konmaz.
const dir = path.join(__dirname, 'fixtures');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.xml'));

describe('fixtures', () => {
  it('klasörde en az bir örnek var', () => expect(files.length).toBeGreaterThan(0));

  it.each(files)('%s ayrıştırılır', (file) => {
    const parsed = parseInput(fs.readFileSync(path.join(dir, file), 'utf-8'));
    expect(parsed.documents.length).toBeGreaterThan(0);
    for (const d of parsed.documents) {
      const info = extractDocInfo(d.doc, d.docType);
      expect(info.number).toBeTruthy();
      expect(info.issueDate).toBeTruthy();
    }
  });

  it('zarftaki iki fatura ayrı belge olarak çıkar', () => {
    const parsed = parseInput(fs.readFileSync(path.join(dir, 'zarf_ornek.xml'), 'utf-8'));
    expect(parsed.documents.map((d) => extractDocInfo(d.doc, d.docType).number)).toEqual([
      'ABC2026000000001',
      'ABC2026000000002',
    ]);
  });
});
