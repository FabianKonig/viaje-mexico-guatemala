#!/usr/bin/env node
/** Gibt den SHA-256-Hash einer Datei aus (für translation.source_sha256). */
import fs from 'node:fs';
import crypto from 'node:crypto';

const file = process.argv[2];
if (!file) {
  console.error('Aufruf: node scripts/hash-original.mjs <pfad/zu/original.md>');
  process.exit(1);
}
console.log(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'));
