import { defineConfig } from 'vite';
import eslint from 'vite-plugin-eslint';
import { crx } from '@crxjs/vite-plugin';
import { resolve } from 'path';
import manifest from './src/manifest.json';

export default defineConfig({
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      clientPort: 5173,
    },
    cors: {
      origin: '*',
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      allowedHeaders: 'Content-Type, Authorization',
    },
  },
  plugins: [
    crx({ manifest }),
    eslint({
      failOnError: true,
      failOnWarning: false,
      include: ['src/**/*.js', 'index.js', 'filter.js', 'state.js']
    }),
  ],
});