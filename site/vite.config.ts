import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Tanıtım sitesi: uygulamadan ayrı derlenir, Vercel'e statik olarak gider.
export default defineConfig({
  root: __dirname,
  plugins: [react()],
  build: { outDir: path.resolve(__dirname, '../dist-site'), emptyOutDir: true },
  server: { port: 5174, strictPort: true },
});
