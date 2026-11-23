import { describe, it, expect } from 'vitest';
import { parseGibResponse, inputFromDocInfo } from '../src/lib/gib';
import type { DocInfo } from '../src/lib/ubl';

describe('GİB Response Parser', () => {
  it('parses valid e-Fatura response (Code 1) with timestamps', () => {
    const raw = '1 RECEIVE_TIME=20261019120000 SEND_TIME=20261019120530';
    const parsed = parseGibResponse(raw, 'EFATURA');

    expect(parsed.status).toBe('OK');
    expect(parsed.code).toBe('1');
    expect(parsed.message).toContain('ulaştırılmış');
    expect(parsed.gibTime).toBe('19.10.2026 12:00:00');
    expect(parsed.receiverTime).toBe('19.10.2026 12:05:30');
  });

  it('parses not found response (Code 0)', () => {
    const raw = '0';
    const parsed = parseGibResponse(raw, 'EFATURA');

    expect(parsed.status).toBe('NOT_FOUND');
    expect(parsed.code).toBe('0');
  });

  it('parses rejected response (Code 2)', () => {
    const raw = '2 RESPONSE_TIME=20261019143000';
    const parsed = parseGibResponse(raw, 'EFATURA');

    expect(parsed.status).toBe('REJECTED');
    expect(parsed.code).toBe('2');
    expect(parsed.extra).toContain('19.10.2026 14:30:00');
  });

  it('parses e-Arşiv valid response (Code 1)', () => {
    const raw = '1';
    const parsed = parseGibResponse(raw, 'EARSIV');

    expect(parsed.status).toBe('OK');
    expect(parsed.code).toBe('1');
    expect(parsed.message).toContain('kayıtlı (geçerli)');
  });

  it('builds GibQueryInput correctly from DocInfo', () => {
    const info: DocInfo = {
      docType: 'Invoice',
      profileId: 'EARSIVFATURA',
      number: 'EAR2026000000005',
      supplierId: '1234567890',
      customerId: '9876543210',
      payableAmount: '1500.50',
      lineExtensionAmount: '1250.00',
      issueDate: '2026-10-18',
    };

    const input = inputFromDocInfo(info);
    expect(input.kind).toBe('EARSIV');
    expect(input.belgeNo).toBe('EAR2026000000005');
    expect(input.saticiVkn).toBe('1234567890');
    expect(input.aliciVkn).toBe('9876543210');
    expect(input.odenecekTutar).toBe('1500.50');
    expect(input.toplamTutar).toBe('1250.00');
    expect(input.tarih).toBe('2026-10-18');
  });
});
