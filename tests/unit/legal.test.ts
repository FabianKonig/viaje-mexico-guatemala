import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { check, classify, collect, render } from '../../scripts/third-party-notices.mjs';
import { checkDist } from '../../scripts/check-dist.mjs';
import { COPYRIGHT_LINE, SITE } from '../../src/config';

describe('Lizenzen', () => {
  it('THIRD-PARTY-NOTICES.md ist aktuell', () => {
    expect(fs.readFileSync('THIRD-PARTY-NOTICES.md', 'utf8')).toBe(render(collect()) + '\n');
  });

  it('keine Abhängigkeit mit starkem Copyleft oder unbekannter Lizenz', () => {
    expect(check(collect())).toEqual([]);
  });

  it('erkennt Copyleft richtig', () => {
    expect(classify('GPL-3.0')).toBe('strong');
    expect(classify('AGPL-3.0-only')).toBe('strong');
    expect(classify('LGPL-3.0-or-later')).toBe('weak');
    expect(classify('MPL-2.0')).toBe('weak');
    expect(classify('MIT')).toBe('permissive');
    expect(classify('Apache-2.0 AND LGPL-3.0-or-later')).toBe('weak');
    expect(
      check([{ name: 'x', version: '1.0.0', license: 'GPL-2.0', dev: true, optional: false }]),
    ).toHaveLength(1);
  });

  it('LICENSE, Schrift-Lizenzen und Hinweise existieren, keine Open-Source-Lizenz für eigene Inhalte', () => {
    for (const f of [
      'LICENSE',
      'THIRD-PARTY-NOTICES.md',
      'public/fonts/OFL-Fraunces.txt',
      'public/fonts/OFL-DM-Sans.txt',
    ])
      expect(fs.existsSync(f), f).toBe(true);
    expect(fs.readFileSync('LICENSE', 'utf8').startsWith(COPYRIGHT_LINE)).toBe(true);
    for (const f of fs.readdirSync('.')) {
      if (/^(LICEN[CS]E|COPYING)/i.test(f))
        expect(fs.readFileSync(f, 'utf8')).not.toMatch(
          /Permission is hereby granted|GNU GENERAL|Creative Commons|Apache License/,
        );
    }
  });

  it('Name in Impressum und Copyright stammt aus derselben Einstellung', () => {
    const impressum = fs.readFileSync('src/pages/impressum.astro', 'utf8');
    expect(impressum).toContain('SITE.ownerName');
    expect(COPYRIGHT_LINE).toContain(SITE.ownerName);
  });

  it('robots.txt sperrt alles', () => {
    expect(fs.readFileSync('public/robots.txt', 'utf8')).toBe('User-agent: *\nDisallow: /\n');
  });
});

describe('Prüfung des Build-Ergebnisses', () => {
  const page = (body: string, extra = '') =>
    `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>T</title><meta name="robots" content="noindex, nofollow, noimageindex"><meta name="copyright" content="${COPYRIGHT_LINE}"><meta property="og:image" content="https://viaje.fabiankonig.de/og.jpg">${extra}</head><body><main>${body}</main><footer><p>${COPYRIGHT_LINE}</p></footer></body></html>`;

  it('findet defekte Links, fremde Ziele und fehlendes noindex', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dist-'));
    fs.writeFileSync(
      path.join(dir, 'index.html'),
      page('<a href="/fehlt/">x</a> <a href="https://tracker.example/">y</a>'),
    );
    fs.mkdirSync(path.join(dir, 'b'));
    fs.writeFileSync(
      path.join(dir, 'b', 'index.html'),
      page('<a href="../">ok</a>').replace(
        '<meta name="robots" content="noindex, nofollow, noimageindex">',
        '',
      ),
    );
    const r = await checkDist(dir, '/');
    const msg = r.problems.join('\n');
    expect(msg).toMatch(/defekter Link \/fehlt\//);
    expect(msg).toMatch(/externer Link nicht erlaubt: https:\/\/tracker\.example/);
    expect(msg).toMatch(/b\/index\.html: noindex-Meta fehlt/);
    expect(msg).not.toMatch(/defekter Link \.\.\//);
  });
});
