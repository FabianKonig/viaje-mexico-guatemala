import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import YAML from 'yaml';
import { scopeFor } from '../../scripts/lib/ci-scope.mjs';

describe('CI-Testumfang', () => {
  it('nur Dokumente im Hauptordner → docs', () => {
    expect(scopeFor(['SPEC.md'])).toBe('docs');
    expect(scopeFor(['SPEC.md', 'TODO.md', 'AGENTS.md', 'README.md', 'MANUAL-TESTS.md'])).toBe(
      'docs',
    );
  });

  it('nur Inhalt (mit oder ohne Dokumente) → content', () => {
    expect(scopeFor(['content/places.yaml'])).toBe('content');
    expect(
      scopeFor([
        'content/posts/2026-11-25-a/index.md',
        'content/posts/2026-11-25-a/photos/01.jpg',
        'TODO.md',
      ]),
    ).toBe('content');
  });

  it.each([
    ['Code', 'src/pages/index.astro'],
    ['Skript', 'scripts/build.mjs'],
    ['Test', 'tests/e2e/map.spec.ts'],
    ['Testinhalt', 'tests/fixtures/content/posts/a/index.md'],
    ['Abhängigkeiten', 'package-lock.json'],
    ['Workflow', '.github/workflows/ci.yml'],
    ['Konfiguration', 'playwright.config.ts'],
    ['statische Datei', 'public/robots.txt'],
    ['Lizenz', 'LICENSE'],
    ['Markdown im Unterordner (außerhalb content/)', 'src/notes/x.md'],
    ['Pfad, der nur ähnlich heißt', 'contents/x.md'],
  ])('%s → full', (_name, file) => {
    expect(scopeFor([file])).toBe('full');
    expect(scopeFor(['SPEC.md', file])).toBe('full');
    expect(scopeFor(['content/places.yaml', file])).toBe('full');
  });

  it('Leerzeilen werden ignoriert', () => {
    expect(scopeFor(['', 'SPEC.md', ' '])).toBe('docs');
  });
});

describe('ci.yml nutzt den Testumfang', () => {
  const wf = fs.readFileSync('.github/workflows/ci.yml', 'utf8');
  const doc = YAML.parse(wf);
  const steps: Array<Record<string, string>> = doc.jobs.test.steps;

  it('Job heißt weiter „Tests“ und ist nie per Pfadfilter übersprungen (Pflicht-Check)', () => {
    expect(doc.jobs.test.name).toBe('Tests');
    expect(wf).not.toMatch(/paths(-ignore)?:/);
  });

  it('Lint und Unit-Tests laufen immer, Build und Browser nur außerhalb von docs', () => {
    const byName = (re: RegExp) => steps.find((s) => re.test(s.name ?? ''))!;
    for (const re of [/Lint/, /Unit-Tests/, /Sicherheitsprüfung/]) {
      expect(byName(re).if, String(re)).toBeUndefined();
    }
    for (const re of [/^Build/, /Browser installieren/]) {
      expect(byName(re).if, String(re)).toContain("!= 'docs'");
    }
    for (const s of steps.filter((s) => /Browser-Tests/.test(s.name))) {
      expect(s.if, s.name).toMatch(/scope == '(full|content)'/);
    }
  });

  it('Bei content nur Chromium, sonst alle Browser', () => {
    expect(wf).toContain("steps.scope.outputs.scope == 'content'");
    expect(wf).toContain('npm run test:e2e:local');
    expect(wf).toContain('npm run test:e2e\n');
  });
});
