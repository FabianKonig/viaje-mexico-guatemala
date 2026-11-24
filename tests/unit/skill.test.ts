import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import YAML from 'yaml';

const skill = fs.readFileSync('.claude/skills/neuer-beitrag/SKILL.md', 'utf8');
const agents = fs.readFileSync('AGENTS.md', 'utf8');

describe('Skill neuer-beitrag', () => {
  const front = /^---\n([\s\S]*?)\n---\n/.exec(skill)!;
  const meta = YAML.parse(front[1]);

  it('hat Name (wie der Ordner) und eine Beschreibung', () => {
    expect(meta.name).toBe('neuer-beitrag');
    expect(String(meta.description).length).toBeGreaterThan(60);
  });

  it('verweist nur auf AGENTS-Abschnitte, die es gibt', () => {
    const refs = [...skill.matchAll(/„([^“]+)“/g)].map((m) => m[1]);
    const headings = [...agents.matchAll(/^#{2,3} (.+)$/gm)].map((m) => m[1]);
    const sections = refs.filter((r) =>
      /^(Ablauf|Medien holen|Übersetzungsregeln|Spanisch-Lernhilfe|Bestehenden Beitrag ändern|Fotoregeln|Kartenregeln)/.test(
        r,
      ),
    );
    expect(sections.length).toBeGreaterThanOrEqual(7);
    for (const s of sections)
      expect(
        headings.some((h) => h.startsWith(s)),
        s,
      ).toBe(true);
  });

  it('nennt die Werkzeuge und Regeln, die AGENTS.md für große Dateien vorschreibt', () => {
    for (const term of ['copy_file', 'share_file', 'import-media.mjs', 'außerhalb', 'Papierkorb'])
      expect(skill, term).toContain(term);
    for (const term of ['copy_file', 'share_file', 'update_file', 'trash_file', 'restrictedReader'])
      expect(agents, term).toContain(term);
  });

  it('AGENTS.md nennt den Skill', () => {
    expect(agents).toContain('neuer-beitrag');
  });

  it('Regel „Medien nicht inhaltlich auswerten“ steht in AGENTS.md, SPEC.md und im Skill', () => {
    const spec = fs.readFileSync('SPEC.md', 'utf8');
    expect(agents).toContain('Medien nicht inhaltlich auswerten');
    expect(spec).toContain('Keine inhaltliche Auswertung der Medien');
    expect(skill).toMatch(/nicht ansehen und nicht beschreiben/);
    expect(skill).toMatch(/ansehen, analysieren oder beschreiben/);
    // keine Anweisung mehr, Bilder zu beschreiben
    for (const text of [agents, skill]) {
      expect(text).not.toMatch(/beschreibender deutscher `alt`/);
      expect(text).not.toMatch(/Fotos und Videos\s+ansehen/);
    }
  });

  it('Lern-Datei (Spanisch-Lernhilfe) ist in AGENTS.md, SPEC.md und im Skill beschrieben', () => {
    const spec = fs.readFileSync('SPEC.md', 'utf8');
    for (const text of [agents, spec, skill]) {
      expect(text).toContain('Lernhilfe-Übersicht');
      expect(text).toMatch(/Lernhilfe-<(JJJJ-MM-TT-)?(slug|ordner)>/);
    }
    // Kategorien für die Übersicht stehen fest in AGENTS.md
    for (const term of ['Akzente und Schreibung', '`ser`/`estar`', 'Verbformen und Zeiten'])
      expect(agents, term).toContain(term);
    // privat: nie ins Repository
    expect(agents).toMatch(/nur in Google Drive/i);
    expect(skill).toMatch(/nie ins Repository/);
    // Anker aus SPEC.md zeigt auf die echte Überschrift
    expect(agents).toContain('## Spanisch-Lernhilfe (Lern-Datei in Google Drive)');
  });

  it('Änderung bestehender Beiträge: Lern-Datei wird nicht mit Medien oder Text verwechselt', () => {
    const spec = fs.readFileSync('SPEC.md', 'utf8');
    expect(agents).toContain('## Bestehenden Beitrag ändern (Medien oder Text)');
    for (const text of [agents, skill, spec]) {
      expect(text).toContain('Lernhilfe-');
      expect(text).toMatch(/Übersicht/);
    }
    // Präfixregel und Neuaufbau bei Textänderung
    expect(agents).toMatch(/Lernhilfe-` oder `tmp-` beginnt, sind nie Medien/);
    expect(skill).toMatch(/nie\*\* Medien oder Text/);
    expect(agents).toMatch(/Zählung dieses Beitrags \*\*ersetzen\*\*/);
    expect(spec).toMatch(/Zählung ersetzt/);
  });

  it('¿ und ¡ am Anfang: in der Fassung still setzen, sonst nie erwähnen (Wunsch des Autors)', () => {
    const spec = fs.readFileSync('SPEC.md', 'utf8');
    for (const text of [agents, skill, spec]) {
      expect(text).toMatch(/still/);
      expect(text).toMatch(/nie erwähn/);
    }
    for (const text of [agents, spec]) expect(text).toContain('`¿`');
    // keine eigene Kategorie mehr für ¿ ¡
    expect(agents).toContain('Satzzeichen (ohne `¿ ¡`)');
    expect(agents).not.toContain('Satzzeichen (`¿ ¡`)');
  });
});
