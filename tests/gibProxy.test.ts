import { describe, it, expect, vi, afterEach } from 'vitest';
import { proxyGibQuery } from '../electron/gibProxy';
import { queryGib } from '../src/lib/gib';

afterEach(() => {
  delete window.gib;
});

describe('proxyGibQuery doğrulaması (ağa çıkmadan)', () => {
  it('geçersiz REPTYPE reddedilir', async () => {
    const r = await proxyGibQuery(new URLSearchParams('REPTYPE=HACK'));
    expect(r.status).toBe(400);
  });

  it('200 karakterden uzun parametre reddedilir', async () => {
    const r = await proxyGibQuery(new URLSearchParams({ REPTYPE: 'EFTRDOGRULAMA', FATNO: 'x'.repeat(201) }));
    expect(r.status).toBe(400);
  });
});

describe('queryGib → Electron IPC köprüsü', () => {
  const input = { kind: 'EFATURA' as const, saticiVkn: '1234567890', belgeNo: 'ABC2026000000001' };

  it('sorguyu window.gib.query ile ana sürece gönderir', async () => {
    const query = vi.fn(async (_q: string) => ({ status: 200, body: { ok: true, raw: '1 RECEIVE_TIME=20261019120000' } }));
    window.gib = { query };
    await queryGib(input);
    const sent = new URLSearchParams(query.mock.calls[0][0]);
    expect(sent.get('REPTYPE')).toBe('EFTRDOGRULAMA');
    expect(sent.get('BIRIMKOD')).toBe('ABC');
  });

  it('ana süreç hata dönerse ERROR ve mesajı aktarır', async () => {
    window.gib = { query: async () => ({ status: 504, body: { ok: false, error: 'GİB sunucusu zaman aşımına uğradı.' } }) };
    const r = await queryGib(input);
    expect(r.status).toBe('ERROR');
    expect(r.code).toBe('504');
    expect(r.message).toContain('zaman aşımı');
  });

  it('köprü yoksa (tarayıcı) anlaşılır hata döner', async () => {
    const r = await queryGib(input);
    expect(r.status).toBe('ERROR');
    expect(r.message).toContain('masaüstü');
  });
});
