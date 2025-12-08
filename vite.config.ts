import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig(config => ({
  base: '/biliardino-elo/',
  publicDir: false,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  build: {
    rollupOptions: {
      input: {
        // main page
        main: path.resolve(__dirname, 'index.html'),
        // extra page
        players: path.resolve(__dirname, 'players.html')
      }
    }
  }
}));
