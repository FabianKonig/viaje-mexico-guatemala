#!/usr/bin/env node
/**
 * Build-Ablauf:
 *   1. Bilder verarbeiten (scripts/images.mjs) → public/media, .cache/media-manifest.json
 *   2. astro build → OUT_DIR (Standard dist)
 *   3. Prüfungen des Ergebnisses: keine Metadaten/GPS in veröffentlichten Bildern
 * Umgebungsvariablen: SITE_URL, BASE_PATH, OUT_DIR, CONTENT_DIR, PREVIEW (siehe SPEC.md).
 * Bricht bei jedem Fehler mit Exit-Code ≠ 0 ab.
 */
import { spawnSync } from 'node:child_process';
import { processAll, verifyDir } from './images.mjs';
import { checkDist } from './check-dist.mjs';

const outDir = process.env.OUT_DIR || 'dist';

function run(cmd, args) {
  const r = spawnSync(cmd, args, {
    stdio: 'inherit',
    env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' },
  });
  if (r.status !== 0) {
    console.error(`\n✗ Fehlgeschlagen: ${cmd} ${args.join(' ')}`);
    process.exit(r.status ?? 1);
  }
}

try {
  await processAll({ contentDir: process.env.CONTENT_DIR || 'content' });
  run('npx', ['astro', 'build']);
  const n = await verifyDir(outDir);
  console.log(`Metadaten-Prüfung ${outDir}: ${n} Bilder ohne EXIF/GPS/XMP/IPTC.`);
  let base = process.env.BASE_PATH || '/';
  if (!base.endsWith('/')) base += '/';
  const r = await checkDist(outDir, base);
  if (r.problems.length)
    throw new Error('Prüfung des Build-Ergebnisses:\n  ' + r.problems.join('\n  '));
  console.log(
    `Build-Prüfung ${outDir}: ${r.pages} Seiten ok (Links, HTML, noindex, Copyright), Startseite ohne Fotos ${Math.round(r.homeBytes / 1024)} KB, gesamt ${Math.round(r.distBytes / 1048576)} MiB.`,
  );
} catch (e) {
  console.error('\n✗ ' + (e instanceof Error ? e.message : String(e)));
  process.exit(1);
}
console.log('\n✓ Build fertig.');
