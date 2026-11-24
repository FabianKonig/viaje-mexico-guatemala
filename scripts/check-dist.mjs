#!/usr/bin/env node
/**
 * Prüft das Build-Ergebnis:
 *  - interne Links und Ressourcen (href, src, srcset) zeigen auf vorhandene Dateien
 *  - externe Links nur auf erlaubte Ziele (Palabrita, YouTube, Datenschutzerklärungen)
 *  - jede Seite: noindex-Meta, Copyright-Zeile, Open-Graph-Bild mit absoluter URL
 *  - HTML-Validierung (html-validate)
 *  - Seitengewicht der Startseite ohne Fotos (Budget fürs Handy-Netz)
 *  - Gesamtgröße der Seite (GitHub Pages: 1 GB; Warnung ab 700 MiB, Fehler ab 900 MiB)
 * Aufruf: node scripts/check-dist.mjs [ordner] [basispfad]
 */
import fs from 'node:fs';
import path from 'node:path';
import { HtmlValidate, FileSystemConfigLoader } from 'html-validate';

export const ALLOWED_EXTERNAL = [
  /^https:\/\/palabrita\.fabiankonig\.de\/?$/,
  /^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$/,
  /^https:\/\/docs\.github\.com\/de\/site-policy\//,
  /^https:\/\/policies\.google\.com\/privacy/,
  /^https:\/\/viaje\.fabiankonig\.de\//,
];
/** GitHub Pages erlaubt höchstens 1 GB veröffentlichte Seite. Warnung ab 700 MiB, Fehler ab 900 MiB. */
export const DIST_WARN = 700 * 1024 * 1024;
export const DIST_MAX = 900 * 1024 * 1024;

/** Bewertet die Gesamtgröße der veröffentlichten Seite: 'ok' | 'warn' | 'fail'. */
export function distSizeStatus(bytes) {
  return bytes > DIST_MAX ? 'fail' : bytes > DIST_WARN ? 'warn' : 'ok';
}

/** Budget: Startseite (HTML + CSS + JS + Schriften + SVG/Icons, ohne Fotos) in Bytes. */
export const HOME_BUDGET = 260 * 1024;

function walk(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
}

function resolveLocal(dist, base, pageFile, url) {
  const pageDir = '/' + path.relative(dist, path.dirname(pageFile)).split(path.sep).join('/');
  const abs = new URL(
    url,
    'http://x' + base.replace(/\/$/, '') + (pageDir === '/' ? '/' : pageDir + '/'),
  ).pathname;
  if (!abs.startsWith(base)) return { ok: false, why: `außerhalb des Basispfads (${abs})` };
  let rel = decodeURIComponent(abs.slice(base.length));
  let file = path.join(dist, rel);
  if (rel === '' || rel.endsWith('/')) file = path.join(file, 'index.html');
  return { ok: fs.existsSync(file), why: `${abs} fehlt` };
}

export async function checkDist(dist = 'dist', base = '/') {
  const problems = [];
  const files = walk(dist);
  const pages = files.filter((f) => f.endsWith('.html'));
  for (const file of pages) {
    const html = fs.readFileSync(file, 'utf8');
    const rel = path.relative(dist, file);
    if (!html.includes('<meta name="robots" content="noindex, nofollow, noimageindex">'))
      problems.push(`${rel}: noindex-Meta fehlt`);
    if (!/© 2026–2027 .+\. Alle Rechte vorbehalten\./.test(html))
      problems.push(`${rel}: Copyright-Zeile fehlt`);
    if (!/<meta name="copyright" content="© 2026–2027/.test(html))
      problems.push(`${rel}: meta copyright fehlt`);
    const og = /<meta property="og:image" content="([^"]+)"/.exec(html)?.[1];
    if (!og || !/^https:\/\//.test(og))
      problems.push(`${rel}: og:image fehlt oder ist nicht absolut`);
    const urls = [...html.matchAll(/\s(?:href|src)="([^"]+)"/g)].map((m) => m[1]);
    for (const m of html.matchAll(/\ssrcset="([^"]+)"/g))
      urls.push(...m[1].split(',').map((s) => s.trim().split(/\s+/)[0]));
    for (const url of urls) {
      if (url.startsWith('#') || url.startsWith('data:') || url.startsWith('mailto:')) continue;
      if (/^https?:\/\//.test(url)) {
        if (!ALLOWED_EXTERNAL.some((r) => r.test(url)))
          problems.push(`${rel}: externer Link nicht erlaubt: ${url}`);
        continue;
      }
      const r = resolveLocal(dist, base, file, url.split('#')[0].split('?')[0]);
      if (!r.ok) problems.push(`${rel}: defekter Link ${url} (${r.why})`);
    }
  }

  // HTML-Validierung
  const htmlvalidate = new HtmlValidate(new FileSystemConfigLoader());
  for (const file of pages) {
    const report = await htmlvalidate.validateFile(file);
    if (!report.valid) {
      for (const r of report.results)
        for (const m of r.messages)
          problems.push(
            `${path.relative(dist, file)}:${m.line}:${m.column} HTML: ${m.message} (${m.ruleId})`,
          );
    }
  }

  // Seitengewicht Startseite (ohne Fotos)
  const home = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
  let bytes = Buffer.byteLength(home);
  const assets = new Set(
    [...home.matchAll(/\s(?:href|src)="([^"]+\.(?:css|js|woff2|svg))"/g)].map((m) => m[1]),
  );
  for (const a of assets) {
    const f = path.join(dist, a.replace(base, '/').replace(/^\//, ''));
    if (fs.existsSync(f)) bytes += fs.statSync(f).size;
  }
  if (bytes > HOME_BUDGET)
    problems.push(
      `Startseite ohne Fotos: ${Math.round(bytes / 1024)} KB > Budget ${HOME_BUDGET / 1024} KB`,
    );

  const distBytes = files.reduce((sum, f) => sum + fs.statSync(f).size, 0);
  const mib = Math.round(distBytes / 1048576);
  const status = distSizeStatus(distBytes);
  if (status === 'fail')
    problems.push(
      `Veröffentlichte Seite ist ${mib} MiB groß (Grenze ${DIST_MAX / 1048576} MiB, GitHub Pages erlaubt 1 GB). Videos auslagern oder verkleinern.`,
    );
  else if (status === 'warn')
    console.warn(
      `::warning::Veröffentlichte Seite ist ${mib} MiB groß (Warnung ab ${DIST_WARN / 1048576} MiB, GitHub Pages erlaubt 1 GB).`,
    );

  return { problems, pages: pages.length, homeBytes: bytes, distBytes };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dist = process.argv[2] || process.env.OUT_DIR || 'dist';
  let base = process.argv[3] || process.env.BASE_PATH || '/';
  if (!base.endsWith('/')) base += '/';
  const r = await checkDist(dist, base);
  if (r.problems.length) {
    console.error('✗ Prüfung des Build-Ergebnisses:\n  ' + r.problems.join('\n  '));
    process.exit(1);
  }
  console.log(
    `Build-Prüfung ${dist}: ${r.pages} Seiten ok, Startseite ohne Fotos ${Math.round(r.homeBytes / 1024)} KB.`,
  );
}
