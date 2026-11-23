import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Electron paketlenmiş sürümde dist/index.html'i file:// ile açar; varlık yolları göreli olmalı.
  base: './',
  plugins: [react()],
  // release/ içindeki paketlenmiş HTML'ler bağımlılık taramasına girmesin.
  optimizeDeps: { entries: ['index.html'] },
  server: {
    port: 5173,
    strictPort: true,
  },
  test: {
    environment: 'jsdom',
  },
});
