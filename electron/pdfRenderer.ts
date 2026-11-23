import { app, BrowserWindow, session } from 'electron';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * HTML → A4 PDF, ana süreçte. Belge gizli bir pencerede Chromium'un yazdırma motoruyla
 * basılır: arayüz donmaz, pencere küçültülse de durmaz, PDF'teki metin seçilebilir kalır.
 */

const PRINTABLE_W_PX = 748; // A4 210mm − 2×6mm kenar boşluğu, 96 dpi
const PRINTABLE_H_PX = 1077; // 297mm − 2×6mm
const MARGIN_IN = 6 / 25.4;
const POOL_SIZE = 2;

const idle: BrowserWindow[] = [];
const waiting: ((w: BrowserWindow) => void)[] = [];
let created = 0;

function createWorker(): BrowserWindow {
  // Faturadaki XSLT çıktısı güvenilmez içerik: ayrı oturum, sandbox, Node yok, yeni pencere/gezinme yok.
  const ses = session.fromPartition('pdf-render');
  ses.setPermissionRequestHandler((_wc, _p, cb) => cb(false));
  const win = new BrowserWindow({
    show: false,
    width: PRINTABLE_W_PX,
    height: 1000,
    useContentSize: true,
    webPreferences: { session: ses, sandbox: true, contextIsolation: true, nodeIntegration: false, backgroundThrottling: false },
  });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  return win;
}

function acquire(): Promise<BrowserWindow> {
  const w = idle.pop();
  if (w && !w.isDestroyed()) return Promise.resolve(w);
  if (created < POOL_SIZE) {
    created++;
    return Promise.resolve(createWorker());
  }
  return new Promise((r) => waiting.push(r));
}

function release(w: BrowserWindow) {
  if (w.isDestroyed()) {
    created--;
    return;
  }
  const next = waiting.shift();
  if (next) next(w);
  else idle.push(w);
}

const MEASURE = '[document.documentElement.scrollWidth, document.documentElement.scrollHeight]';

// Görseller, fontlar ve QR kod üreten scriptler hazır olana kadar bekler (en çok 4 sn), sonra ölçer.
const SETTLE = `new Promise((done) => {
  const measure = () => done([document.documentElement.scrollWidth, document.documentElement.scrollHeight]);
  const imgs = [...document.images].filter((i) => !i.complete);
  Promise.all(imgs.map((i) => new Promise((r) => { i.onload = i.onerror = r; })))
    .then(() => document.fonts && document.fonts.ready)
    .then(() => setTimeout(measure, 250));
  setTimeout(measure, 4000);
})`;

const TIMEOUT_MS = 20_000;

export async function renderPdf(html: string): Promise<Buffer> {
  const win = await acquire();
  const file = path.join(os.tmpdir(), `zarfpdf-${randomUUID()}.html`);
  // Sonsuz döngüye giren bir fatura scripti pencereyi kilitlerse pencereyi at, kuyruk tıkanmasın.
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, rej) => {
    timer = setTimeout(() => { win.destroy(); rej(new Error('Belge zamanında hazırlanamadı.')); }, TIMEOUT_MS);
  });
  try {
    await fs.writeFile(file, html, 'utf8');
    return await Promise.race([print(win, file), timeout]);
  } finally {
    clearTimeout(timer);
    fs.unlink(file).catch(() => {});
    release(win);
  }
}

async function print(win: BrowserWindow, file: string): Promise<Buffer> {
  await win.loadFile(file);
  win.setContentSize(PRINTABLE_W_PX, 1000);
  let [w, h] = (await win.webContents.executeJavaScript(SETTLE)) as [number, number];
  // Bazı tasarımlar pencere genişledikçe büyür; genişlik sabitlenene kadar pencereyi içeriğe göre aç (en çok 6 adım).
  let viewW = PRINTABLE_W_PX;
  for (let i = 0; i < 6 && w > viewW + 3 && w < 4000; i++) {
    viewW = w;
    win.setContentSize(viewW, 1000);
    await new Promise((r) => setTimeout(r, 120));
    [w, h] = (await win.webContents.executeJavaScript(MEASURE)) as [number, number];
  }
  // Sabit genişlikli tasarımlar sayfaya sığacak kadar küçültülür; bir sayfayı az aşan belge tek sayfaya sıkıştırılır.
  let scale = Math.min(1, PRINTABLE_W_PX / Math.max(w, 1));
  const pageH = PRINTABLE_H_PX / scale;
  if (h > pageH && h <= pageH * 1.12) scale *= pageH / h;
  return await win.webContents.printToPDF({
    pageSize: 'A4',
    printBackground: true,
    margins: { top: MARGIN_IN, bottom: MARGIN_IN, left: MARGIN_IN, right: MARGIN_IN },
    scale: Math.max(0.1, scale),
  });
}

app.on('before-quit', () => {
  for (const w of idle) if (!w.isDestroyed()) w.destroy();
});
