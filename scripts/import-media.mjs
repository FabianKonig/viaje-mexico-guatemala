#!/usr/bin/env node
/**
 * Import von Handy-Fotos und -Videos in einen Beitrag (siehe scripts/lib/import.mjs).
 *
 * Aufruf:  node scripts/import-media.mjs <quellordner> <beitrags-slug>
 *   z. B.  node scripts/import-media.mjs ~/Downloads/Reise-Inbox/2026-11-25-teotihuacan 2026-11-25-teotihuacan
 *
 * Braucht ffmpeg und ffprobe (nur für Videos): sudo apt-get install -y ffmpeg
 * Schreibt nach content/posts/<slug>/photos und /clips und druckt einen Frontmatter-Vorschlag.
 */
import path from 'node:path';
import { frontmatterSnippet, importMedia } from './lib/import.mjs';
import { hasFfmpeg } from './lib/video.mjs';

const [, , source, slug] = process.argv;
if (!source || !slug) {
  console.error('Aufruf: node scripts/import-media.mjs <quellordner> <JJJJ-MM-TT-slug>');
  process.exit(2);
}
if (!/^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
  console.error('Der Beitrags-Slug muss JJJJ-MM-TT-slug sein (klein, Bindestriche).');
  process.exit(2);
}
if (!hasFfmpeg()) {
  console.error('ffmpeg/ffprobe fehlen. Installieren: sudo apt-get install -y ffmpeg');
  process.exit(1);
}
try {
  const postDir = path.join(process.env.CONTENT_DIR || 'content', 'posts', slug);
  const r = await importMedia({ source, postDir });
  const mb =
    (r.photos.reduce((s, p) => s + p.bytes, 0) + r.clips.reduce((s, c) => s + c.bytes, 0)) /
    1048576;
  console.log(
    `\n${r.photos.length} Fotos, ${r.clips.length} Videos importiert (${mb.toFixed(1)} MB), ${r.skipped.length} übersprungen.`,
  );
  if (r.photos.length || r.clips.length)
    console.log('\nFrontmatter-Vorschlag für index.md:\n\n' + frontmatterSnippet(r));
} catch (e) {
  console.error('✗ ' + (e instanceof Error ? e.message : String(e)));
  process.exit(1);
}
