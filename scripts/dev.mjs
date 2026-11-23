import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { createServer } from 'vite';

/** Geliştirme: Vite dev sunucusunu açar, Electron'u ona bağlar. Electron kapanınca Vite de kapanır. */
const server = await createServer();
await server.listen();
const url = server.resolvedUrls.local[0];

await import('./build-electron.mjs');

const electronPath = createRequire(import.meta.url)('electron');
const child = spawn(electronPath, ['.', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, VITE_DEV_SERVER_URL: url },
});
child.on('close', async (code) => {
  await server.close();
  process.exit(code ?? 0);
});
