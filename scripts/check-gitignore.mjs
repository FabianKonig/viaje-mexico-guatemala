#!/usr/bin/env node
/**
 * Prüft, dass keine Dateien eingecheckt sind, die laut .gitignore ausgeschlossen sein sollten
 * (z. B. .env, node_modules, Original-Fotos).
 */
import { execFileSync } from 'node:child_process';

export function trackedButIgnored() {
  const out = execFileSync(
    'git',
    ['ls-files', '--cached', '--ignored', '--exclude-standard', '-z'],
    {
      encoding: 'utf8',
    },
  );
  return out.split('\0').filter(Boolean);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const files = trackedButIgnored();
  if (files.length) {
    console.error('Diese Dateien sind eingecheckt, obwohl .gitignore sie ausschließt:');
    for (const f of files) console.error('  ' + f);
    console.error('Entfernen mit: git rm --cached <datei>');
    process.exit(1);
  }
  console.log('gitignore-Prüfung: ok');
}
