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

  it('Squash-Merge ist dokumentiert', () => {
    for (const f of ['SPEC.md', 'AGENTS.md', 'TODO.md', 'README.md']) {
      expect(fs.readFileSync(f, 'utf8'), f).toMatch(/[Ss]quash/);
    }
  });

  it('CI nutzt die Node-Version aus .nvmrc und gepinnte Actions', () => {
    const ci = fs.readFileSync('.github/workflows/ci.yml', 'utf8');
    expect(ci).toContain('node-version-file: .nvmrc');
    for (const line of ci.split('\n').filter((l) => l.includes('uses:'))) {
      expect(line, line).toMatch(/@[0-9a-f]{40} # v\d/);
    }
  });
});
