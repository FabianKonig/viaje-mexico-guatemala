#!/usr/bin/env node
/**
 * Bestimmt für die CI den Testumfang (docs | content | full), siehe scripts/lib/ci-scope.mjs.
 * Schreibt `scope=...` in $GITHUB_OUTPUT (und gibt es aus). Im Pull-Request wird gegen den ersten
 * Elternteil des Merge-Commits verglichen (= aktueller Stand von main). Bei allem Unklaren
 * (kein Pull-Request, Git-Fehler) gilt `full`.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { scopeFor } from './lib/ci-scope.mjs';

export function changedFiles() {
  const out = execFileSync('git', ['diff', '--name-only', '-z', 'HEAD^1', 'HEAD'], {
    encoding: 'utf8',
  });
  return out.split('\0').filter(Boolean);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  let scope = 'full';
  if (process.env.GITHUB_EVENT_NAME === 'pull_request') {
    try {
      const files = changedFiles();
      scope = files.length ? scopeFor(files) : 'full';
      console.log(`${files.length} geänderte Dateien:\n  ${files.join('\n  ')}`);
    } catch (err) {
      console.log(`Änderungen nicht bestimmbar (${err.message.split('\n')[0]}), voller Lauf.`);
    }
  } else {
    console.log('Kein Pull-Request, voller Lauf.');
  }
  console.log(`Testumfang: ${scope}`);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `scope=${scope}\n`);
}
