import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { coverSvgProblems, renderCoverJpeg } from '../../scripts/lib/cover.mjs';
import { makeCover, setCoverGenerated } from '../../scripts/make-cover.mjs';
import { inspectImage } from '../../scripts/images.mjs';

const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1200">' +
  '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">' +
  '<stop offset="0" stop-color="#f2a900"/><stop offset="1" stop-color="#d4457a"/></linearGradient></defs>' +
  '<rect width="1600" height="1200" fill="url(#g)"/><circle cx="800" cy="600" r="200" fill="#c4552d"/></svg>';

describe('gezeichnetes Titelbild', () => {
  it('erzeugt ein JPEG 1600×1200 ohne Metadaten', async () => {
    const jpeg = await renderCoverJpeg(svg);
    const m = await sharp(jpeg).metadata();
    expect([m.format, m.width, m.height]).toEqual(['jpeg', 1600, 1200]);
    const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cover-')), 'c.jpg');
    fs.writeFileSync(f, jpeg);
    expect(await inspectImage(f)).toEqual([]);
  });

  it('lehnt Schrift, Bilder, Skripte und externe Verweise ab', () => {
    expect(coverSvgProblems(svg)).toEqual([]);
    for (const bad of [
      '<svg><text>Hola</text></svg>',
      '<svg><image href="data:image/png;base64,AAAA"/></svg>',
      '<svg><script>alert(1)</script></svg>',
      '<svg><rect fill="url(https://x.example/a.svg#f)"/></svg>',
      '<svg><a href="https://x.example"><rect/></a></svg>',
      '<svg><style>@import "x.css";</style></svg>',
      'kein svg',
    ])
      expect(coverSvgProblems(bad).length, bad).toBeGreaterThan(0);
  });

  it('trägt coverGenerated ein und ersetzt cover', () => {
    const md = "---\ntitle: 'T'\ndate: 2026-11-24\ncover: 02.jpg\nphotos: []\n---\n";
    const out = setCoverGenerated(md);
    expect(out).toBe(
      "---\ntitle: 'T'\ndate: 2026-11-24\ncoverGenerated: cover.jpg\nphotos: []\n---\n",
    );
    expect(setCoverGenerated(out)).toBe(out);
  });

  it('makeCover schreibt cover.jpg und ändert index.md', async () => {
    const content = fs.mkdtempSync(path.join(os.tmpdir(), 'content-'));
    const dir = path.join(content, 'posts', '2026-11-24-a');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.md'), '---\ntitle: T\ndate: 2026-11-24\n---\n');
    const svgFile = path.join(content, 'c.svg');
    fs.writeFileSync(svgFile, svg);
    await makeCover({ contentDir: content, slug: '2026-11-24-a', svgFile });
    expect((await sharp(path.join(dir, 'cover.jpg')).metadata()).width).toBe(1600);
    expect(fs.readFileSync(path.join(dir, 'index.md'), 'utf8')).toContain(
      'coverGenerated: cover.jpg',
    );
    await expect(
      makeCover({ contentDir: content, slug: '2026-11-99-fehlt', svgFile }),
    ).rejects.toThrow(/nicht gefunden/);
  });
});
