#!/usr/bin/env node
/**
 * Build-Ablauf: (später: Bilder verarbeiten) → astro build → Prüfungen des Ergebnisses.
 * Umgebungsvariablen: SITE_URL, BASE_PATH, OUT_DIR, CONTENT_DIR, PREVIEW (siehe AGENTS.md).
 * Bricht bei jedem Fehler mit Exit-Code ≠ 0 ab.
 */
import { spawnSync } from 'node:child_process';

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

run('npx', ['astro', 'build']);
console.log('\n✓ Build fertig.');
