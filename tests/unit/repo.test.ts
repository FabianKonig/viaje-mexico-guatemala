import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { trackedButIgnored } from '../../scripts/check-gitignore.mjs';
import { SITE, COPYRIGHT_LINE } from '../../src/config';

describe('Repository', () => {
  it('enthält keine eingecheckten Dateien, die .gitignore ausschließt', () => {
    expect(trackedButIgnored()).toEqual([]);
  });

  it('hat die Pflichtdokumente', () => {
    for (const f of [
      'AGENTS.md',
      'SPEC.md',
      'TODO.md',
      'README.md',
      'LICENSE',
      '.gitignore',
      'MANUAL-TESTS.md',
      'THIRD-PARTY-NOTICES.md',
    ]) {
      expect(fs.existsSync(f), f).toBe(true);
    }
  });

  it('LICENSE ist ein Rechtevorbehalt mit demselben Namen wie die Seite, keine Open-Source-Lizenz', () => {
    const license = fs.readFileSync('LICENSE', 'utf8');
    expect(license).toContain(COPYRIGHT_LINE);
    expect(license).toContain('Alle Rechte vorbehalten');
    for (const oss of [
      'MIT License',
      'GNU GENERAL PUBLIC',
      'Apache License',
      'Creative Commons',
      'Permission is hereby granted',
    ]) {
      expect(license).not.toContain(oss);
    }
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    expect(pkg.license).toBe('UNLICENSED');
    expect(pkg.private).toBe(true);
  });

  it('.gitignore schließt Original-Fotos und Geheimnisse aus, aber keine Inhalte', () => {
    const gi = fs.readFileSync('.gitignore', 'utf8');
    for (const p of [
      'node_modules/',
      'dist/',
      '.astro/',
      '.cache/',
      'playwright-report/',
      'test-results/',
      'coverage/',
      '.env',
      '.DS_Store',
      'Thumbs.db',
      '.idea/',
      'tmp/',
      '_originals/',
    ]) {
      expect(gi).toContain(p);
    }
    for (const forbidden of ['content/', 'photos/', 'places.yaml', 'fonts/', 'icons/', 'LICENSE']) {
      expect(gi.split('\n').some((l) => l.trim() === forbidden)).toBe(false);
    }
  });

  it('CNAME zeigt auf die eigene Domain', () => {
    expect(fs.readFileSync('public/CNAME', 'utf8').trim()).toBe('viaje.fabiankonig.de');
    expect(SITE.title).toBe('Un viaje a México y Guatemala');
  });
});
