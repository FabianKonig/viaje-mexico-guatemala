#!/usr/bin/env node
/**
 * Erzeugt das Standard-Vorschaubild für WhatsApp & Co. (public/og-default.jpg, 1200×630, ohne Metadaten).
 * Rendert eine kleine HTML-Seite mit den selbst gehosteten Schriften in Chromium (Playwright).
 * Einmalig bzw. bei Designänderungen ausführen: node scripts/make-og.mjs  (Ergebnis wird eingecheckt)
 * Lokal mit vorinstalliertem Chromium: PW_CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/make-og.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const font = (f) =>
  'data:font/woff2;base64,' + fs.readFileSync(path.resolve('public/fonts', f)).toString('base64');
const picado = fs
  .readFileSync('src/components/PapelPicado.astro', 'utf8')
  .match(/<svg[\s\S]*?<\/svg>/)[0];
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Fraunces;src:url(${font('fraunces-latin-wght-normal.woff2')});font-weight:100 900}
@font-face{font-family:'DM Sans';src:url(${font('dm-sans-latin-wght-normal.woff2')});font-weight:100 1000}
:root{--sand:#F6EBD9;--ink:#2B1D16;--pink:#D4457A;--marigold:#F2A900;--turquoise:#0E7C86;--terracotta:#C4552D}
body{margin:0;width:1200px;height:630px;background:#F6EBD9;color:#2B1D16;font-family:'DM Sans';overflow:hidden}
.picado{transform:scale(1.6);transform-origin:top left;width:62.5%!important}
main{padding:70px 80px;position:relative}
.flag{position:absolute;right:70px;top:260px;width:220px}
h1{font-family:Fraunces;font-weight:800;font-size:92px;line-height:1.02;margin:0 0 34px;letter-spacing:-1px}
.badge{display:inline-block;background:#F2A900;border:3px solid #2B1D16;border-radius:14px;box-shadow:9px 9px 0 #2B1D16;padding:12px 26px;font-family:Fraunces;font-weight:800;font-size:40px}
p{font-size:30px;margin:28px 0 0}
</style></head><body>${picado.replace('class="picado"', 'class="picado"')}<main><h1>Un viaje a México<br>y Guatemala</h1><span class="badge">Mi español, sin corregir</span><p>Reisetagebuch mit deutscher Übersetzung</p>${fs.readFileSync('public/icons/icon-512.png').length ? `<img class="flag" src="data:image/png;base64,${fs.readFileSync('public/icons/icon-512.png').toString('base64')}">` : ''}</main></body></html>`;

const browser = await chromium.launch(
  process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
);
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
const png = await page.screenshot({ type: 'png' });
await browser.close();
await sharp(png).jpeg({ quality: 82, mozjpeg: true }).toFile('public/og-default.jpg');
console.log('public/og-default.jpg erzeugt');
