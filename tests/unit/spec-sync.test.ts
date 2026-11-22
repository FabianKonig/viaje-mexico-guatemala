/**
 * Hält SPEC.md und Code synchron: Versionen, Merge-Regel, Umsetzungsstand.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const spec = fs.readFileSync('SPEC.md', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

function versionTable(): Map<string, string> {
  const block = spec.split('<!-- versions:start -->')[1]?.split('<!-- versions:end -->')[0] ?? '';
  const rows = block
    .split('\n')
    .filter((l) => l.startsWith('|') && !l.includes('---') && !l.includes('Werkzeug'));
  return new Map(
    rows.map((l) => {
      const [, name, version] = l.split('|').map((c) => c.trim());
      return [name, version];
    }),
  );
}

describe('SPEC.md ↔ Code', () => {
  const table = versionTable();

  it('listet genau die Abhängigkeiten aus package.json mit denselben Versionen', () => {
    const deps = { ...pkg.dependencies, ...pkg.devDependencies } as Record<string, string>;
    for (const [name, version] of Object.entries(deps)) {
      expect(table.get(name), `${name} fehlt oder hat andere Version in SPEC.md`).toBe(version);
    }
    for (const name of table.keys()) {
      if (name === 'node' || name === 'npm') continue;
      expect(deps[name], `${name} steht in SPEC.md, aber nicht in package.json`).toBeDefined();
    }
  });

  it('Node- und npm-Version stimmen mit .nvmrc und engines überein', () => {
    const nvmrc = fs.readFileSync('.nvmrc', 'utf8').trim();
    expect(table.get('node')).toMatch(new RegExp(`^${nvmrc}\\b`));
    expect(pkg.engines.node).toMatch(new RegExp(`^>=${nvmrc}\\.`));
    expect(pkg.engines.npm).toBe(`>=${table.get('npm')}`);
  });

  it('alle Versionen sind exakt gepinnt', () => {
    const deps = { ...pkg.dependencies, ...pkg.devDependencies } as Record<string, string>;
    for (const [name, version] of Object.entries(deps)) {
      expect(version, name).toMatch(/^\d+\.\d+\.\d+$/);
    }
  });

  it('Farben in SPEC.md entsprechen den CSS-Variablen', () => {
    const css = fs.readFileSync('src/styles/global.css', 'utf8');
    const block = spec.split('<!-- colors:start -->')[1].split('<!-- colors:end -->')[0];
    const rows = block.split('\n').filter((l) => /^\| [a-z-]+ \| #/.test(l));
    expect(rows.length).toBeGreaterThanOrEqual(10);
    for (const row of rows) {
      const [, name, value] = row.split('|').map((c) => c.trim());
      expect(css.toLowerCase(), name).toContain(`--${name}: ${value.toLowerCase()};`);
    }
  });

  it('Texte und Adressen aus SPEC.md stehen so im Code', () => {
    const cfg = fs.readFileSync('src/config.ts', 'utf8');
    for (const t of ['https://palabrita.fabiankonig.de', 'Un viaje a México y Guatemala']) {
      expect(spec).toContain(t);
      expect(cfg).toContain(t);
    }
  });

  it('Squash-Merge ist dokumentiert', () => {
    for (const f of ['SPEC.md', 'AGENTS.md', 'TODO.md', 'README.md']) {
      expect(fs.readFileSync(f, 'utf8'), f).toMatch(/[Ss]quash/);
    }
  });

  it('Workflows nutzen die Node-Version aus .nvmrc und gepinnte Actions', () => {
    for (const f of ['ci.yml', 'deploy.yml']) {
      const wf = fs.readFileSync('.github/workflows/' + f, 'utf8');
      expect(wf, f).toContain('node-version-file: .nvmrc');
      for (const line of wf
        .split('\n')
        .filter((l) => l.includes('uses:') && !l.includes('./.github/'))) {
        expect(line, line).toMatch(/@[0-9a-f]{40} # v\d/);
      }
    }
  });

  it('Deployment: erst Tests, dann Build, dann Veröffentlichung; nur von main', () => {
    const wf = fs.readFileSync('.github/workflows/deploy.yml', 'utf8');
    expect(wf).toMatch(/push:\s+branches: \[main\]/);
    expect(wf).toContain('uses: ./.github/workflows/ci.yml');
    expect(wf).toMatch(/build:[\s\S]*needs: tests/);
    expect(wf).toMatch(/deploy:[\s\S]*needs: build/);
    expect(wf).toContain('SITE_URL: https://viaje.fabiankonig.de');
  });
});

import YAML from 'yaml';
describe('Workflows', () => {
  it('sind gültiges YAML', () => {
    for (const f of fs.readdirSync('.github/workflows')) {
      const doc = YAML.parseDocument(fs.readFileSync('.github/workflows/' + f, 'utf8'));
      expect(doc.errors, f).toEqual([]);
      expect(Object.keys(doc.toJS().jobs ?? {}).length, f).toBeGreaterThan(0);
    }
  });
});
