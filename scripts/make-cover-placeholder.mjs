#!/usr/bin/env node
/**
 * Erzeugt ein Platzhalter-Titelbild „Ankunft“ (landendes Flugzeug, eigenes Motiv, ohne Fremdgrafik,
 * ohne Metadaten) für einen Beitrag, der noch kein Titelbild-Foto hat. Ergebnis: JPEG 1600×1200 (4:3).
 * Aufruf:  node scripts/make-cover-placeholder.mjs <ausgabe.jpg> "<Überschrift>" ["<Unterzeile>"]
 *   z. B.  node scripts/make-cover-placeholder.mjs content/posts/<slug>/photos/titelbild.jpg "Llegada a México"
 * Dann im Frontmatter `cover: titelbild.jpg` eintragen (die Datei bleibt außerhalb der Galerie `photos`).
 * Lokal mit vorinstalliertem Chromium: PW_CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/make-cover-placeholder.mjs …
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const [, , out, headline, subline = ''] = process.argv;
if (!out || !headline) {
  console.error(
    'Aufruf: node scripts/make-cover-placeholder.mjs <ausgabe.jpg> "<Überschrift>" ["<Unterzeile>"]',
  );
  process.exit(2);
}
const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const font = (f) =>
  'data:font/woff2;base64,' + fs.readFileSync(path.resolve('public/fonts', f)).toString('base64');
const picado = fs
  .readFileSync('src/components/PapelPicado.astro', 'utf8')
  .match(/<svg[\s\S]*?<\/svg>/)[0];
const plane = `<svg class="plane" viewBox="0 0 420 170" xmlns="http://www.w3.org/2000/svg" stroke="#2B1D16" stroke-width="6" stroke-linejoin="round" stroke-linecap="round">
<path d="M52 72 L28 12 L82 12 L124 62Z" fill="#D4457A"/>
<path d="M22 84 C22 58 130 48 306 52 C366 54 404 70 406 84 C404 98 366 112 306 114 C130 120 22 110 22 84Z" fill="#fff"/>
<path d="M330 56 C372 58 400 70 402 82 L330 82Z" fill="#0E7C86"/>
<path d="M60 90 L380 90" fill="none" stroke="#D4457A" stroke-width="8"/>
<path d="M176 96 L124 156 L178 156 L262 102Z" fill="#F2A900"/>
<rect x="192" y="104" width="70" height="26" rx="13" fill="#C4552D"/>
<g fill="#0E7C86" stroke-width="4"><circle cx="210" cy="74" r="7"/><circle cx="240" cy="74" r="7"/><circle cx="270" cy="74" r="7"/><circle cx="300" cy="74" r="7"/></g>
<path d="M214 130 V148 M344 112 V136" fill="none"/>
<g fill="#2B1D16" stroke="none"><circle cx="214" cy="154" r="11"/><circle cx="344" cy="142" r="11"/></g>
</svg>`;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Fraunces;src:url(${font('fraunces-latin-wght-normal.woff2')});font-weight:100 900}
@font-face{font-family:'DM Sans';src:url(${font('dm-sans-latin-wght-normal.woff2')});font-weight:100 1000}
:root{--sand:#F6EBD9;--ink:#2B1D16;--pink:#D4457A;--marigold:#F2A900;--turquoise:#0E7C86;--terracotta:#C4552D}
body{margin:0;width:1600px;height:1200px;background:#F6EBD9;color:#2B1D16;font-family:'DM Sans';overflow:hidden;position:relative}
.picado{transform:scale(2.6);transform-origin:top left;width:62.5%!important}
.sun{position:absolute;left:1250px;top:410px;width:230px;height:230px;border-radius:50%;background:#F2A900;border:6px solid #2B1D16}
.cloud{position:absolute;height:60px;background:#fff;border:6px solid #2B1D16;border-radius:60px}
.runway{position:absolute;left:0;right:0;top:860px;height:170px;background:#C4552D;border-top:8px solid #2B1D16;border-bottom:8px solid #2B1D16}
.runway i{position:absolute;top:76px;height:14px;width:110px;background:#F6EBD9;border-radius:7px}
.plane{position:absolute;left:380px;top:560px;width:640px;transform:rotate(7deg);transform-origin:center}
.trail{position:absolute;left:0;top:0}
h1{position:absolute;left:0;right:0;top:215px;margin:0;text-align:center;font-family:Fraunces;font-weight:800;font-size:132px;line-height:1;letter-spacing:-2px}
.badge{position:absolute;left:50%;top:1060px;transform:translateX(-50%);white-space:nowrap;background:#F2A900;border:4px solid #2B1D16;border-radius:18px;box-shadow:10px 10px 0 #2B1D16;padding:12px 32px;font-family:Fraunces;font-weight:800;font-size:46px}
</style></head><body>${picado}
<div class="sun"></div><div class="cloud" style="left:110px;top:720px;width:230px"></div><div class="cloud" style="left:1120px;top:720px;width:220px"></div><div class="cloud" style="left:760px;top:430px;width:170px"></div>
<h1>${esc(headline)}</h1>
<svg class="trail" width="1600" height="1200"><path d="M40 390 C170 440 290 510 390 585" fill="none" stroke="#2B1D16" stroke-width="7" stroke-dasharray="4 26" stroke-linecap="round"/></svg>
${plane}
<div class="runway"><i style="left:60px"></i><i style="left:300px"></i><i style="left:540px"></i><i style="left:780px"></i><i style="left:1020px"></i><i style="left:1260px"></i><i style="left:1500px"></i></div>
${subline ? `<span class="badge">${esc(subline)}</span>` : ''}</body></html>`;

const browser = await chromium.launch(
  process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
);
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
const png = await page.screenshot({ type: 'png' });
await browser.close();
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
await sharp(png).jpeg({ quality: 84, mozjpeg: true }).toFile(out);
console.log(`${out} erzeugt`);
