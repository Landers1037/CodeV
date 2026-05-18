import { defineConfig } from 'vite';
import path from 'node:path';

// https://vitejs.dev/config
export default defineConfig({
  resolve: {
    alias: {
      '@': path.join(__dirname, 'src'),
    },
  },
  build: {
    rollupOptions: {
      external: ['@lydell/node-pty', 'font-list'],
    },
  },
});
