import { describe, expect, it } from 'vitest';
import YAML from 'yaml';
import fs from 'node:fs';
import type { Place } from '../../src/lib/content';
import { loadPlaces } from '../../src/lib/content';
import {
  buildRouteMap,
  clusterPoints,
  compressRanges,
  makeProjection,
  numberPlaces,
  placeLabel,
  spreadMarkers,
  DESKTOP_BBOX,
} from '../../src/lib/map';

const P = (
  id: string,
  lat: number,
  lon: number,
  country: 'MX' | 'GT' = 'MX',
  region?: string,
): Place => ({
  id,
  name: id,
  lat,
  lon,
  country,
  arrived: '2026-11-23',
  ...(region ? { region } : {}),
});
const fixture = YAML.parse(
  fs.readFileSync('tests/fixtures/content/places.yaml', 'utf8'),
) as Place[];

describe('Routenkarte: Ortsliste und Nummerierung', () => {
  it('nummeriert in Reihenfolge der Liste, der letzte Ort ist aktuell', () => {
    const n = numberPlaces([P('a', 19, -99), P('b', 17, -96), P('c', 16, -92)]);
    expect(n.map((x) => x.number)).toEqual([1, 2, 3]);
    expect(n.map((x) => x.current)).toEqual([false, false, true]);
  });

  it('echte Ortsliste beginnt mit Ciudad de México', () => {
    const places = loadPlaces('content');
    expect(places[0].name).toBe('Ciudad de México');
    const map = buildRouteMap(places);
    expect(map.places[0].number).toBe(1);
    expect(map.current?.place.id).toBe(places[places.length - 1].id);
  });

  it('nur ein Ort: ein Marker, aktuell, „Aquí estoy“, keine Route, kein Ausschnitt', () => {
    const map = buildRouteMap([P('cdmx', 19.43, -99.13)]);
    expect(map.desktop.markers).toEqual([expect.objectContaining({ number: 1, current: true })]);
    expect(map.desktop.route).toBeNull();
    expect(map.desktop.here).not.toBeNull();
    expect(map.mobile.here).not.toBeNull();
    expect(map.insets).toEqual([]);
    expect(map.places[0].inInset).toBe(false);
  });

  it('derselbe Ort zweimal (zweiter Besuch) bekommt eine eigene Nummer', () => {
    const map = buildRouteMap([
      P('cdmx', 19.43, -99.13),
      P('oaxaca', 17.07, -96.72),
      P('cdmx-2', 19.43, -99.13),
    ]);
    expect(map.places.map((p) => p.number)).toEqual([1, 2, 3]);
    expect(map.desktop.pills.map((p) => p.label)).toEqual(['1, 3']);
  });
});

describe('Routenkarte: Zusammenfassung naher Orte', () => {
  it('Nummernbereiche', () => {
    expect(compressRanges([4, 5, 6, 7, 8])).toBe('4–8');
    expect(compressRanges([1, 3])).toBe('1, 3');
    expect(compressRanges([8, 2, 3, 9])).toBe('2–3, 8–9');
    expect(compressRanges([5])).toBe('5');
  });

  it('gruppiert Punkte unter dem Mindestabstand, auch über Zwischenpunkte', () => {
    expect(
      clusterPoints(
        [
          [0, 0],
          [10, 0],
          [20, 0],
          [100, 0],
        ],
        28,
      ),
    ).toEqual([[0, 1, 2]]);
    expect(
      clusterPoints(
        [
          [0, 0],
          [30, 0],
        ],
        28,
      ),
    ).toEqual([]);
  });

  it('Testroute: Chiapas, Yucatán und Guatemala werden zu Pillen mit Ausschnitt', () => {
    const map = buildRouteMap(fixture);
    expect(map.desktop.pills.map((p) => p.label)).toEqual(['3–4', '5–7', '8–12']);
    expect(map.mobile.pills.map((p) => p.label)).toEqual(['3–4', '5–7', '8–12']);
    expect(map.insets.map((i) => i.title)).toEqual(['Chiapas', 'Yucatán', 'Guatemala']);
    const gt = map.insets[2];
    expect(gt.markers.map((m) => m.number)).toEqual([8, 9, 10, 11, 12]);
    expect(gt.markers.find((m) => m.current)?.number).toBe(12);
    expect(gt.here).not.toBeNull();
    expect(gt.labels.map((l) => l.text)).toEqual(
      expect.arrayContaining(['México', 'Belice', 'Honduras']),
    );
    expect(gt.labels.map((l) => l.text)).not.toContain('Guatemala');
    // aktuelle Pille ist markiert, Rahmen markiert die vergrößerte Region
    const pill = map.desktop.pills[2];
    expect(pill.current).toBe(true);
    expect(pill.frame.width).toBeGreaterThan(0);
    // einzeln stehende Orte bleiben Marker
    expect(map.desktop.markers.map((m) => m.number)).toEqual([1, 2]);
    // Legende: Orte in Ausschnitten markiert
    expect(map.places.filter((p) => p.inInset).map((p) => p.number)).toEqual([
      3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    ]);
  });

  it('Gruppen ohne gemeinsame Region heißen nach dem Land bzw. „México y Guatemala“', () => {
    const map = buildRouteMap([
      P('a', 19.4, -99.1),
      P('b', 16.9, -89.9, 'GT'),
      P('c', 17.0, -90.3, 'GT'),
      P('d', 17.5, -91.0, 'MX'),
    ]);
    expect(map.insets.map((i) => i.title)).toEqual(['México y Guatemala']);
  });

  it('Orte im Ausschnitt überlappen nicht', () => {
    const spread = spreadMarkers(
      [
        { x: 100, y: 100 },
        { x: 101, y: 100 },
        { x: 100, y: 100 },
      ],
      38,
      400,
      300,
    );
    for (let i = 0; i < spread.length; i++)
      for (let j = i + 1; j < spread.length; j++)
        expect(
          Math.hypot(spread[i].x - spread[j].x, spread[i].y - spread[j].y),
        ).toBeGreaterThanOrEqual(37);
  });
});

describe('Routenkarte: Erzeugung', () => {
  it('Projektion: Norden oben, Westen links, Breite wie angegeben', () => {
    const p = makeProjection(DESKTOP_BBOX, 800);
    expect(p.width).toBe(800);
    const [xw, yn] = p.project([-117, 32]);
    const [xe, ys] = p.project([-88, 15]);
    expect(xw).toBeLessThan(xe);
    expect(yn).toBeLessThan(ys);
  });

  it('nur die erlaubten Beschriftungen in der Gesamtkarte, keine Ortsnamen', () => {
    const map = buildRouteMap(fixture);
    for (const view of [map.desktop, map.mobile]) {
      const texts = view.labels.map((l) => l.text);
      expect(texts.every((t) => ['México', 'Golfo de México', 'Océano Pacífico'].includes(t))).toBe(
        true,
      );
    }
    expect(map.desktop.labels.map((l) => l.text).sort()).toEqual([
      'Golfo de México',
      'México',
      'Océano Pacífico',
    ]);
  });

  it('Route verbindet alle Orte in Reihenfolge', () => {
    const map = buildRouteMap(fixture);
    expect(map.desktop.route?.split('L')).toHaveLength(fixture.length);
  });

  it('Handy: nur der Süden, große Marker; erweitert sich für Orte im Norden', () => {
    const south = buildRouteMap(fixture);
    expect(south.mobile.markerR).toBeGreaterThanOrEqual(20);
    const north = buildRouteMap([...fixture, P('tijuana', 32.5, -117.0)]);
    expect(north.mobile.height / north.mobile.width).toBeGreaterThan(
      south.mobile.height / south.mobile.width,
    );
  });

  it('„Aquí estoy“ verdeckt keine Marker und bleibt im Bild', () => {
    const box = placeLabel(
      { x: 380, y: 100, width: 20, height: 20 },
      80,
      20,
      [{ x: 405, y: 60, width: 30, height: 80 }],
      { width: 400, height: 300 },
      5,
    );
    expect(box.x + box.width).toBeLessThanOrEqual(400);
    const map = buildRouteMap(fixture);
    for (const view of [map.desktop, map.mobile, ...map.insets]) {
      const h = view.here;
      if (!h) continue;
      expect(h.x).toBeGreaterThanOrEqual(0);
      expect(h.y).toBeGreaterThanOrEqual(0);
      expect(h.x + h.width).toBeLessThanOrEqual(view.width);
      expect(h.y + h.height).toBeLessThanOrEqual(view.height);
      for (const m of view.markers) {
        const cx = Math.max(h.x, Math.min(m.x, h.x + h.width));
        const cy = Math.max(h.y, Math.min(m.y, h.y + h.height));
        expect(Math.hypot(cx - m.x, cy - m.y), `Marker ${m.number}`).toBeGreaterThanOrEqual(
          view.markerR * 0.6,
        );
      }
    }
  });
});
