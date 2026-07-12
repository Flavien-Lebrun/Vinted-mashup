import { defineConfig } from 'vite';
import eslint from 'vite-plugin-eslint';
import { crx } from '@crxjs/vite-plugin';
import { resolve } from 'path';
import manifest from './src/manifest.json';

export default defineConfig({
  root: resolve(__dirname, 'src'),
  publicDir: resolve(__dirname, 'public'),
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
  server: {
    // Force the dev server to use a strict port and cors settings 
    // to allow Chrome to fetch internal modules safely
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
    crx({ 
        manifest 
    }),
    eslint({
      failOnError: true,   // Breaks the build if there is a syntax or import error
      failOnWarning: false,
      include: ['src/**/*.js', 'index.js', 'filter.js', 'state.js'] // Adjust paths to your files
    })],
});