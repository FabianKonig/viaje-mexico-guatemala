#!/usr/bin/env node
/**
 * Gezeichnetes Titelbild für einen Beitrag erzeugen.
 *
 * Aufruf: node scripts/make-cover.mjs <JJJJ-MM-TT-slug> <zeichnung.svg>
 *
 * Schreibt content/posts/<slug>/cover.jpg (1600×1200, ohne Metadaten) und trägt in index.md
 * `coverGenerated: cover.jpg` ein (ersetzt ein vorhandenes `cover:`). Die SVG liegt im
 * Scratchpad und wird nicht eingecheckt. Zeichnung: flache Formen in den Seitenfarben, keine
 * Schrift (Regeln: AGENTS.md › „Titelbild“). Wichtiges in die mittlere Bildhälfte legen, weil das
 * Vorschaubild für WhatsApp (1200×630) oben und unten beschnitten wird.
 */
import fs from 'node:fs';
import path from 'node:path';
import { renderCoverJpeg } from './lib/cover.mjs';

export const COVER_FILE = 'cover.jpg';

/** Trägt `coverGenerated` im Frontmatter ein und entfernt `cover:`. Gibt den neuen Text zurück. */
export function setCoverGenerated(indexMd) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(indexMd);
  if (!m) throw new Error('index.md ohne Frontmatter');
  const nl = indexMd.includes('\r\n') ? '\r\n' : '\n';
  const lines = m[1].split(/\r?\n/).filter((l) => !/^(cover|coverGenerated):/.test(l));
  const at = lines.findIndex((l) => /^date:/.test(l));
  lines.splice(at >= 0 ? at + 1 : lines.length, 0, `coverGenerated: ${COVER_FILE}`);
  return `---${nl}${lines.join(nl)}${nl}---${indexMd.slice(m[0].length)}`;
}

export async function makeCover({ contentDir = 'content', slug, svgFile }) {
  const dir = path.join(contentDir, 'posts', slug);
  const indexFile = path.join(dir, 'index.md');
  if (!fs.existsSync(indexFile)) throw new Error(`Beitrag ${slug} nicht gefunden (${indexFile})`);
  const jpeg = await renderCoverJpeg(fs.readFileSync(svgFile, 'utf8'));
  fs.writeFileSync(path.join(dir, COVER_FILE), jpeg);
  fs.writeFileSync(indexFile, setCoverGenerated(fs.readFileSync(indexFile, 'utf8')));
  return path.join(dir, COVER_FILE);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [slug, svgFile] = process.argv.slice(2);
  if (!slug || !svgFile) {
    console.error('Aufruf: node scripts/make-cover.mjs <JJJJ-MM-TT-slug> <zeichnung.svg>');
    process.exit(1);
  }
  try {
    const out = await makeCover({
      contentDir: process.env.CONTENT_DIR || 'content',
      slug,
      svgFile,
    });
    console.log(`✓ ${out} geschrieben, coverGenerated in index.md eingetragen.`);
  } catch (e) {
    console.error('✗ ' + e.message);
    process.exit(1);
  }
}
