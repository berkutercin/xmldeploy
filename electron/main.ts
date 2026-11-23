import { app, BrowserWindow, ipcMain, Menu, session } from 'electron';
import path from 'node:path';
import { proxyGibQuery } from './gibProxy';
import { renderPdf } from './pdfRenderer';

/**
 * Electron ana süreci. GİB sorgusu buradan, kullanıcının kendi (Türkiye) IP'sinden atılır;
 * arayüz yalnızca preload'daki `window.gib.query` ile bu süreçle konuşur.
 */

const DEV_URL = process.env.VITE_DEV_SERVER_URL;

function isAppUrl(url: string): boolean {
  return DEV_URL ? url.startsWith(DEV_URL) : url.startsWith('file://');
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1080,
    minHeight: 600,
    title: 'ZarfPDF',
    icon: path.join(__dirname, '../build/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // Küçültülünce zamanlayıcılar yavaşlamasın; toplu PDF ve GİB sorguları arka planda da sürsün.
      backgroundThrottling: false,
    },
  });
  // Gizli PDF pencereleri uygulamayı açık tutmasın.
  win.on('closed', () => app.quit());

  // Önizlemedeki fatura scriptleri yeni pencere ya da sistem tarayıcısıyla veri dışarı taşıyamasın.
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e, url) => {
    if (!isAppUrl(url)) e.preventDefault();
  });

  if (DEV_URL) win.loadURL(DEV_URL);
  else win.loadFile(path.join(__dirname, '../dist/index.html'));
}

ipcMain.handle('gib:query', async (_e, query: unknown) => {
  if (typeof query !== 'string' || query.length > 4000) {
    return { status: 400, body: { ok: false, error: 'Geçersiz sorgu.' } };
  }
  return proxyGibQuery(new URLSearchParams(query), 15000);
});

ipcMain.handle('pdf:render', async (_e, html: unknown) => {
  if (typeof html !== 'string' || html.length > 50_000_000) throw new Error('Geçersiz belge.');
  return renderPdf(html);
});

// Arayüz ve PDF penceresi internete çıkamaz: faturaya gömülü XSLT/script veri sızdıramaz.
// GİB sorgusu ana süreçte Node https ile gider, bundan etkilenmez. Bedeli: URL'den çekilen logolar görünmez.
const allowedUrl = (u: string) =>
  /^(file|data|blob|devtools):/.test(u) ||
  (!!DEV_URL && (u.startsWith(DEV_URL) || u.startsWith(DEV_URL.replace(/^http/, 'ws'))));

app.whenReady().then(() => {
  for (const s of [session.defaultSession, session.fromPartition('pdf-render')]) {
    s.webRequest.onBeforeRequest((d, cb) => cb({ cancel: !allowedUrl(d.url) }));
  }
  Menu.setApplicationMenu(null);
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
