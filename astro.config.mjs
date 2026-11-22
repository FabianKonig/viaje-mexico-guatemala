// @ts-check
import { defineConfig } from 'astro/config';

/**
 * Konfiguration über Umgebungsvariablen:
 *  SITE_URL   – öffentliche Adresse (für absolute Open-Graph-URLs)
 *  BASE_PATH  – Basispfad, z. B. "/pr-preview/pr-12/" für Vorschauen
 *  OUT_DIR    – Ausgabeordner (Standard: dist)
 */
const site = process.env.SITE_URL || 'https://viaje.fabiankonig.de';
let base = process.env.BASE_PATH || '/';
if (!base.endsWith('/')) base += '/';

export default defineConfig({
  site,
  base,
  outDir: process.env.OUT_DIR || './dist',
  output: 'static',
  trailingSlash: 'always',
  // Leerzeichen und Zeilenumbrüche im Originaltext müssen byte-genau erhalten bleiben.
  compressHTML: false,
  build: { format: 'directory', assets: '_astro', inlineStylesheets: 'auto' },
  devToolbar: { enabled: false },
  prefetch: false,
});
