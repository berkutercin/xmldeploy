import { describe, it, expect } from 'vitest';
import { parseInput, parseXml } from '../src/lib/envelope';
import { extractDocInfo, suggestFileBase } from '../src/lib/ubl';

describe('Envelope (Zarf) Parser', () => {
  it('correctly unwraps nested invoices from StandardBusinessDocument envelope', () => {
    const zarfXml = `<?xml version="1.0" encoding="UTF-8"?>
<sh:StandardBusinessDocument xmlns:sh="http://www.unece.org/cefact/namespaces/StandardBusinessDocumentHeader" xmlns:ef="http://www.efatura.gov.tr/package-namespace">
  <sh:StandardBusinessDocumentHeader>
    <sh:HeaderVersion>1.2</sh:HeaderVersion>
    <sh:Sender>
      <sh:Identifier>1234567890</sh:Identifier>
    </sh:Sender>
    <sh:Receiver>
      <sh:Identifier>9876543210</sh:Identifier>
    </sh:Receiver>
    <sh:DocumentIdentification>
      <sh:Standard>UBLTR</sh:Standard>
      <sh:TypeVersion>2.1</sh:TypeVersion>
      <sh:InstanceIdentifier>ZARF-UUID-1234-5678</sh:InstanceIdentifier>
      <sh:Type>SENDERENVELOPE</sh:Type>
      <sh:CreationDateAndTime>2026-10-19T10:00:00Z</sh:CreationDateAndTime>
    </sh:DocumentIdentification>
  </sh:StandardBusinessDocumentHeader>
  <ef:Package>
    <Elements>
      <ElementType>INVOICE</ElementType>
      <ElementCount>2</ElementCount>
      <ElementList>
        <Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
          <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
          <cbc:CustomizationID>TR1.2</cbc:CustomizationID>
          <cbc:ProfileID>TICARIFATURA</cbc:ProfileID>
          <cbc:ID>ABC2026000000001</cbc:ID>
          <cbc:UUID>F47AC10B-58CC-4372-A567-0E02B2C3D479</cbc:UUID>
          <cbc:IssueDate>2026-10-19</cbc:IssueDate>
          <cac:AccountingSupplierParty>
            <cac:Party>
              <cac:PartyIdentification><cbc:ID schemeID="VKN">1234567890</cbc:ID></cac:PartyIdentification>
              <cac:PartyName><cbc:Name>ABC Teknoloji A.Ş.</cbc:Name></cac:PartyName>
            </cac:Party>
          </cac:AccountingSupplierParty>
          <cac:AccountingCustomerParty>
            <cac:Party>
              <cac:PartyIdentification><cbc:ID schemeID="VKN">9876543210</cbc:ID></cac:PartyIdentification>
              <cac:PartyName><cbc:Name>Müşteri Ltd. Şti.</cbc:Name></cac:PartyName>
            </cac:Party>
          </cac:AccountingCustomerParty>
          <cac:LegalMonetaryTotal>
            <cbc:LineExtensionAmount currencyID="TRY">1000.00</cbc:LineExtensionAmount>
            <cbc:TaxExclusiveAmount currencyID="TRY">1000.00</cbc:TaxExclusiveAmount>
            <cbc:TaxInclusiveAmount currencyID="TRY">1200.00</cbc:TaxInclusiveAmount>
            <cbc:PayableAmount currencyID="TRY">1200.00</cbc:PayableAmount>
          </cac:LegalMonetaryTotal>
        </Invoice>
        <Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
          <cbc:ProfileID>TICARIFATURA</cbc:ProfileID>
          <cbc:ID>ABC2026000000002</cbc:ID>
          <cbc:UUID>E47AC10B-58CC-4372-A567-0E02B2C3D480</cbc:UUID>
          <cbc:IssueDate>2026-10-19</cbc:IssueDate>
          <cac:AccountingSupplierParty>
            <cac:Party>
              <cac:PartyIdentification><cbc:ID schemeID="VKN">1234567890</cbc:ID></cac:PartyIdentification>
              <cac:PartyName><cbc:Name>ABC Teknoloji A.Ş.</cbc:Name></cac:PartyName>
            </cac:Party>
          </cac:AccountingSupplierParty>
          <cac:LegalMonetaryTotal>
            <cbc:PayableAmount currencyID="TRY">2500.50</cbc:PayableAmount>
          </cac:LegalMonetaryTotal>
        </Invoice>
      </ElementList>
    </Elements>
  </ef:Package>
</sh:StandardBusinessDocument>`;

    const result = parseInput(zarfXml);
    expect(result.kind).toBe('zarf');
    expect(result.envelope?.instanceIdentifier).toBe('ZARF-UUID-1234-5678');
    expect(result.envelope?.senderIdentifier).toBe('1234567890');
    expect(result.envelope?.receiverIdentifier).toBe('9876543210');
    expect(result.documents.length).toBe(2);

    const doc1 = result.documents[0];
    expect(doc1.docType).toBe('Invoice');
    expect(doc1.xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(doc1.xml).toContain('<Invoice');
    // Ensure it can be parsed as a standalone document without parser errors
    const parsedStandalone = parseXml(doc1.xml);
    expect(parsedStandalone.documentElement.localName).toBe('Invoice');

    const info1 = extractDocInfo(doc1.doc, doc1.docType);
    expect(info1.number).toBe('ABC2026000000001');
    expect(info1.supplierName).toBe('ABC Teknoloji A.Ş.');
    expect(info1.supplierId).toBe('1234567890');
    expect(info1.payableAmount).toBe('1200.00');
    expect(info1.currency).toBe('TRY');

    const suggestedName = suggestFileBase(info1, 'zarf.xml');
    expect(suggestedName).toBe('ABC2026000000001_ABC Teknoloji A.Ş.');
  });

  it('handles standard standalone Invoice XML directly', () => {
    const singleXml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ProfileID>EARSIVFATURA</cbc:ProfileID>
  <cbc:ID>GIB2026000001234</cbc:ID>
  <cbc:IssueDate>2026-10-15</cbc:IssueDate>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification><cbc:ID schemeID="VKN">9998887776</cbc:ID></cac:PartyIdentification>
      <cac:PartyName><cbc:Name>Örnek Satıcı Ltd.</cbc:Name></cac:PartyName>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:LegalMonetaryTotal>
    <cbc:PayableAmount currencyID="TRY">450.00</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
</Invoice>`;

    const result = parseInput(singleXml);
    expect(result.kind).toBe('ubl');
    expect(result.documents.length).toBe(1);

    const info = extractDocInfo(result.documents[0].doc, 'Invoice');
    expect(info.number).toBe('GIB2026000001234');
    expect(info.profileId).toBe('EARSIVFATURA');
    expect(info.supplierName).toBe('Örnek Satıcı Ltd.');
    expect(info.payableAmount).toBe('450.00');
  });
});
