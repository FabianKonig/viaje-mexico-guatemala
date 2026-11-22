#!/usr/bin/env node
/**
 * Erzeugt THIRD-PARTY-NOTICES.md automatisch aus package-lock.json und prüft die Lizenzen.
 *   node scripts/third-party-notices.mjs          → Datei schreiben
 *   node scripts/third-party-notices.mjs --check  → prüfen, ob die Datei aktuell ist (CI)
 * Starkes Copyleft (GPL, AGPL, SSPL …) bricht ab: es könnte die Seite zwingen, offen zu sein.
 * Schwaches Copyleft (LGPL, MPL) ist nur für Werkzeuge erlaubt, die nicht ausgeliefert werden.
 */
import fs from 'node:fs';

const FILE = 'THIRD-PARTY-NOTICES.md';
export const STRONG_COPYLEFT = /\b(A?GPL(?!-?\d?\.?\d?-with)|SSPL|EUPL|OSL|CC-BY-SA|CC-BY-NC)/i;
export const WEAK_COPYLEFT = /\b(LGPL|MPL|EPL|CDDL)/i;

export function collect(lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'))) {
  const pkgs = [];
  for (const [key, v] of Object.entries(lock.packages)) {
    if (!key) continue;
    const name = key.replace(/^.*node_modules\//, '');
    pkgs.push({
      name,
      version: v.version,
      license: v.license || 'UNBEKANNT',
      dev: !!v.dev,
      optional: !!v.optional,
    });
  }
  const seen = new Set();
  return pkgs
    .filter((p) =>
      seen.has(`${p.name}@${p.version}`) ? false : seen.add(`${p.name}@${p.version}`),
    )
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Strong copyleft = Abbruch. LGPL zählt nicht als stark (Regex schließt nur GPL/AGPL ohne L ein). */
export function classify(license) {
  const l = license.replace(/LGPL/gi, 'L_GPL');
  if (/\bA?GPL/i.test(l) || /SSPL|EUPL|OSL|CC-BY-SA|CC-BY-NC/i.test(l)) return 'strong';
  if (WEAK_COPYLEFT.test(license)) return 'weak';
  if (license === 'UNBEKANNT') return 'unknown';
  return 'permissive';
}

export function render(pkgs) {
  const byLicense = new Map();
  for (const p of pkgs) byLicense.set(p.license, [...(byLicense.get(p.license) ?? []), p]);
  const weak = pkgs.filter((p) => classify(p.license) === 'weak');
  const lines = [
    '# Hinweise zu Bestandteilen Dritter',
    '',
    '<!-- Automatisch erzeugt mit `npm run notices`. Nicht von Hand bearbeiten. -->',
    '',
    'Für die Inhalte, den eigenen Code und die Gestaltung dieser Seite gilt: **Alle Rechte vorbehalten**',
    '(siehe [LICENSE](LICENSE)). Die folgenden Bestandteile Dritter stehen unter ihren eigenen Lizenzen.',
    '',
    '## 1. Mit der Seite ausgelieferte Bestandteile',
    '',
    '| Bestandteil | Urheber | Lizenz | Lizenztext |',
    '| --- | --- | --- | --- |',
    '| Schrift **Fraunces** (WOFF2, Achse wght) | The Fraunces Project Authors | SIL Open Font License 1.1 | [public/fonts/OFL-Fraunces.txt](public/fonts/OFL-Fraunces.txt) |',
    '| Schrift **DM Sans** (WOFF2, Achse wght) | The DM Sans Project Authors | SIL Open Font License 1.1 | [public/fonts/OFL-DM-Sans.txt](public/fonts/OFL-DM-Sans.txt) |',
    '',
    'Die Lizenztexte werden mit der Seite unter `/fonts/` ausgeliefert. Alle übrigen ausgelieferten',
    'Dateien (HTML, CSS, JavaScript, Icons, Illustrationen, Karte) sind eigene Werke.',
    '',
    '## 2. Werkzeuge für Build und Tests (werden nicht ausgeliefert)',
    '',
    `Insgesamt ${pkgs.length} npm-Pakete laut \`package-lock.json\` (alle als Entwicklungsabhängigkeit).`,
    '',
    '### Lizenzprüfung',
    '',
    '- Starkes Copyleft (GPL, AGPL, SSPL, CC-BY-SA …): **keines** (sonst bricht die Prüfung ab).',
    `- Schwaches Copyleft (LGPL, MPL): ${weak.length} Pakete, nur Werkzeuge, die beim Bauen oder Testen`,
    '  laufen und nicht mit der Seite verbreitet werden (z. B. libvips in sharp, libheif-js, axe-core,',
    '  lightningcss). Daraus entsteht keine Pflicht, die Seite oder ihren Code offenzulegen.',
    '',
    '### Pakete nach Lizenz',
    '',
  ];
  for (const [license, list] of [...byLicense.entries()].sort(
    (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]),
  )) {
    lines.push(`#### ${license} (${list.length})`, '');
    lines.push(list.map((p) => `\`${p.name}@${p.version}\``).join(', '), '');
  }
  return lines.join('\n');
}

export function check(pkgs) {
  const problems = [];
  for (const p of pkgs) {
    const c = classify(p.license);
    if (c === 'strong')
      problems.push(
        `${p.name}@${p.version}: starkes Copyleft (${p.license}) – bitte dem Autor melden`,
      );
    if (c === 'unknown') problems.push(`${p.name}@${p.version}: Lizenz unbekannt – prüfen`);
    if (c === 'weak' && !p.dev)
      problems.push(`${p.name}@${p.version}: ${p.license} als Laufzeit-Abhängigkeit – prüfen`);
  }
  return problems;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const pkgs = collect();
  const problems = check(pkgs);
  if (problems.length) {
    console.error('✗ Lizenzprüfung:\n  ' + problems.join('\n  '));
    process.exit(1);
  }
  const text = render(pkgs) + '\n';
  if (process.argv.includes('--check')) {
    const current = fs.existsSync(FILE) ? fs.readFileSync(FILE, 'utf8') : '';
    if (current !== text) {
      console.error(`✗ ${FILE} ist veraltet. Bitte \`npm run notices\` ausführen und einchecken.`);
      process.exit(1);
    }
    console.log(`Lizenzprüfung: ok (${pkgs.length} Pakete, ${FILE} aktuell)`);
  } else {
    fs.writeFileSync(FILE, text);
    console.log(`${FILE} geschrieben (${pkgs.length} Pakete).`);
  }
}
