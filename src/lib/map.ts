/**
 * Routenkarte: wird vollständig aus der Ortsliste erzeugt (keine Handarbeit, keine Kartendienste).
 *  - Nummern zählen die besuchten Orte in Reihenfolge der Ortsliste (1, 2, 3 …)
 *  - der letzte Ort ist der aktuelle („Aquí estoy“)
 *  - Orte, die in einer Gesamtkarte zu nah beieinander liegen, werden dort zu einer rosa Pille
 *    („4–8“) zusammengefasst und zusätzlich in einer Ausschnittskarte einzeln gezeigt
 */
import type { Place } from './content';
import {
  COUNTRY_NAMES,
  GUATEMALA,
  INSET_LABELS,
  MEXICO,
  OTHER_LAND,
  OVERVIEW_LABELS,
  type LonLat,
} from './geo';

export interface BBox {
  minLon: number;
  maxLon: number;
  minLat: number;
  maxLat: number;
}

export interface Projection {
  width: number;
  height: number;
  project(ll: LonLat): [number, number];
}

export interface NumberedPlace {
  number: number;
  place: Place;
  current: boolean;
  /** true, wenn der Ort in einer Ausschnittskarte gezeigt wird (gelbe Nummer in der Legende). */
  inInset: boolean;
}

export interface Marker {
  number: number;
  name: string;
  x: number;
  y: number;
  current: boolean;
}

export interface Pill {
  label: string;
  numbers: number[];
  x: number;
  y: number;
  width: number;
  current: boolean;
  /** gestrichelter Rahmen der vergrößerten Region */
  frame: { x: number; y: number; width: number; height: number };
}

export interface MapLabel {
  text: string;
  x: number;
  y: number;
  sea: boolean;
}

export interface MapView {
  width: number;
  height: number;
  markerR: number;
  fontSize: number;
  land: { mexico: string; guatemala: string; other: string[] };
  route: string | null;
  markers: Marker[];
  pills: Pill[];
  labels: MapLabel[];
  /** Schild „Aquí estoy“ (Rechteck oben links, Breite, Höhe), ohne Überdeckung platziert. */
  here: { x: number; y: number; width: number; height: number } | null;
}

export interface InsetView extends MapView {
  title: string;
  numbers: number[];
}

export interface RouteMap {
  places: NumberedPlace[];
  current: NumberedPlace | undefined;
  desktop: MapView;
  mobile: MapView;
  insets: InsetView[];
}

/** Gesamtkarte am Computer: ganz México und Guatemala. */
export const DESKTOP_BBOX: BBox = { minLon: -117.8, maxLon: -86.2, minLat: 13.2, maxLat: 33.2 };
/** Gesamtkarte am Handy: nur der Süden (Reiseregion); wird erweitert, falls Orte außerhalb liegen. */
export const MOBILE_BBOX: BBox = { minLon: -105.6, maxLon: -86.4, minLat: 13.4, maxLat: 23.6 };

export const VARIANTS = {
  desktop: { width: 800, markerR: 13, fontSize: 15, cluster: 30 },
  mobile: { width: 400, markerR: 22, fontSize: 21, cluster: 44 },
  inset: { width: 400, markerR: 17, fontSize: 17 },
} as const;

const r1 = (n: number) => Math.round(n * 10) / 10;

export function makeProjection(bbox: BBox, width: number): Projection {
  const lat0 = ((bbox.minLat + bbox.maxLat) / 2) * (Math.PI / 180);
  const kx = Math.cos(lat0);
  const k = width / ((bbox.maxLon - bbox.minLon) * kx);
  const height = Math.round((bbox.maxLat - bbox.minLat) * k);
  return {
    width,
    height,
    project: ([lon, lat]) => [r1((lon - bbox.minLon) * kx * k), r1((bbox.maxLat - lat) * k)],
  };
}

export function numberPlaces(places: Place[], insetIds: Set<string> = new Set()): NumberedPlace[] {
  return places.map((place, i) => ({
    number: i + 1,
    place,
    current: i === places.length - 1,
    inInset: insetIds.has(place.id),
  }));
}

/** [1,2,3,5,7,8] → "1–3, 5, 7–8" */
export function compressRanges(nums: number[]): string {
  const sorted = [...new Set(nums)].sort((a, b) => a - b);
  const parts: string[] = [];
  for (let i = 0; i < sorted.length; i++) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++;
    parts.push(i === j ? `${sorted[i]}` : `${sorted[i]}–${sorted[j]}`);
    i = j;
  }
  return parts.join(', ');
}

/** Gruppiert Punkte, die (auch über Zwischenpunkte) näher als `threshold` beieinander liegen. */
export function clusterPoints(points: [number, number][], threshold: number): number[][] {
  const parent = points.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < points.length; i++)
    for (let j = i + 1; j < points.length; j++) {
      const d = Math.hypot(points[i][0] - points[j][0], points[i][1] - points[j][1]);
      if (d < threshold) parent[find(i)] = find(j);
    }
  const groups = new Map<number, number[]>();
  points.forEach((_, i) => groups.set(find(i), [...(groups.get(find(i)) ?? []), i]));
  return [...groups.values()].filter((g) => g.length > 1).map((g) => g.sort((a, b) => a - b));
}

/** Vereinigt Gruppen, die gemeinsame Mitglieder haben. */
function mergeGroups(groups: number[][]): number[][] {
  const sets = groups.map((g) => new Set(g));
  let merged = true;
  while (merged) {
    merged = false;
    outer: for (let i = 0; i < sets.length; i++)
      for (let j = i + 1; j < sets.length; j++)
        if ([...sets[j]].some((x) => sets[i].has(x))) {
          sets[j].forEach((x) => sets[i].add(x));
          sets.splice(j, 1);
          merged = true;
          break outer;
        }
  }
  return sets.map((s) => [...s].sort((a, b) => a - b)).sort((a, b) => a[0] - b[0]);
}

function pathOf(outline: LonLat[], p: Projection): string {
  return 'M' + outline.map((ll) => p.project(ll).join(' ')).join('L') + 'Z';
}

function bboxOf(lls: LonLat[]): BBox {
  return {
    minLon: Math.min(...lls.map((l) => l[0])),
    maxLon: Math.max(...lls.map((l) => l[0])),
    minLat: Math.min(...lls.map((l) => l[1])),
    maxLat: Math.max(...lls.map((l) => l[1])),
  };
}

/** Rahmen um eine Gruppe von Orten mit Rand und Mindestgröße (für Ausschnitt und Rahmen). */
export function insetBBox(lls: LonLat[]): BBox {
  const b = bboxOf(lls);
  const cx = (b.minLon + b.maxLon) / 2;
  const cy = (b.minLat + b.maxLat) / 2;
  const spanLon = Math.max(3.2, (b.maxLon - b.minLon) * 1.35 + 1.2);
  const spanLat = Math.max(2.4, (b.maxLat - b.minLat) * 1.35 + 1.0, spanLon * 0.55);
  const spanLon2 = Math.max(spanLon, spanLat * 1.1);
  return {
    minLon: cx - spanLon2 / 2,
    maxLon: cx + spanLon2 / 2,
    minLat: cy - spanLat / 2,
    maxLat: cy + spanLat / 2,
  };
}

/** Erweitert die Handy-Karte, falls ein Ort außerhalb des Südens liegt. */
export function mobileBBox(places: Place[]): BBox {
  const b = { ...MOBILE_BBOX };
  for (const p of places) {
    b.minLon = Math.min(b.minLon, p.lon - 1.2);
    b.maxLon = Math.max(b.maxLon, p.lon + 1.2);
    b.minLat = Math.min(b.minLat, p.lat - 1);
    b.maxLat = Math.max(b.maxLat, p.lat + 1);
  }
  return b;
}

/** Schiebt überlappende Marker auseinander (nur in Ausschnitten). */
export function spreadMarkers<T extends { x: number; y: number }>(
  items: T[],
  minDist: number,
  width: number,
  height: number,
): T[] {
  const pts = items.map((m) => ({ ...m }));
  for (let iter = 0; iter < 60; iter++) {
    let moved = false;
    for (let i = 0; i < pts.length; i++)
      for (let j = i + 1; j < pts.length; j++) {
        let dx = pts[j].x - pts[i].x;
        let dy = pts[j].y - pts[i].y;
        let d = Math.hypot(dx, dy);
        if (d >= minDist) continue;
        if (d < 0.01) {
          dx = 0;
          dy = 1;
          d = 1;
        }
        const push = (minDist - d) / 2 + 0.5;
        pts[i].x -= (dx / d) * push;
        pts[i].y -= (dy / d) * push;
        pts[j].x += (dx / d) * push;
        pts[j].y += (dy / d) * push;
        moved = true;
      }
    const pad = minDist / 2;
    for (const p of pts) {
      p.x = r1(Math.min(width - pad, Math.max(pad, p.x)));
      p.y = r1(Math.min(height - pad, Math.max(pad, p.y)));
    }
    if (!moved) break;
  }
  return pts;
}

function land(p: Projection): MapView['land'] {
  return {
    mexico: pathOf(MEXICO, p),
    guatemala: pathOf(GUATEMALA, p),
    other: OTHER_LAND.map((o) => pathOf(o.outline, p)),
  };
}

function inside(p: Projection, xy: [number, number], marginX: number, marginY: number) {
  return (
    xy[0] >= marginX &&
    xy[0] <= p.width - marginX &&
    xy[1] >= marginY &&
    xy[1] <= p.height - marginY
  );
}

export const HERE_TEXT = 'Aquí estoy';

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

function overlap(a: Box, b: Box): number {
  const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

/**
 * Platziert ein Schild neben `anchor` (Kasten um Marker oder Pille) so, dass es möglichst nichts
 * verdeckt und im Bild bleibt. Kandidaten: rechts/links, oben/unten/mittig.
 */
export function placeLabel(
  anchor: Box,
  width: number,
  height: number,
  obstacles: Box[],
  view: { width: number; height: number },
  gap: number,
): Box {
  const cx = anchor.x + anchor.width / 2;
  const cy = anchor.y + anchor.height / 2;
  const right = anchor.x + anchor.width + gap;
  const left = anchor.x - gap - width;
  const candidates: Box[] = [
    { x: right, y: anchor.y - height * 0.75, width, height },
    { x: left, y: anchor.y - height * 0.75, width, height },
    { x: right, y: cy - height / 2, width, height },
    { x: left, y: cy - height / 2, width, height },
    { x: right, y: anchor.y + anchor.height - height * 0.25, width, height },
    { x: left, y: anchor.y + anchor.height - height * 0.25, width, height },
    { x: cx - width / 2, y: anchor.y - gap - height, width, height },
    { x: cx - width / 2, y: anchor.y + anchor.height + gap, width, height },
  ];
  let best = candidates[0];
  let bestScore = Infinity;
  for (const c of candidates) {
    const outside =
      Math.max(0, -c.x) +
      Math.max(0, c.x + c.width - view.width) +
      Math.max(0, -c.y) +
      Math.max(0, c.y + c.height - view.height);
    const score = obstacles.reduce((sum, o) => sum + overlap(c, o), 0) + outside * c.height * 50;
    if (score < bestScore - 0.01) {
      best = c;
      bestScore = score;
    }
  }
  return { x: r1(best.x), y: r1(best.y), width: r1(best.width), height: r1(best.height) };
}

function hereLabel(
  anchor: Box,
  fs: number,
  r: number,
  obstacles: Box[],
  view: { width: number; height: number },
) {
  const width = HERE_TEXT.length * fs * 0.6 + fs * 0.9;
  return placeLabel(anchor, width, fs * 1.6, obstacles, view, r * 0.45);
}

const markerBox = (m: { x: number; y: number }, r: number): Box => ({
  x: m.x - r,
  y: m.y - r,
  width: 2 * r,
  height: 2 * r,
});
const pillBox = (p: Pill, r: number): Box => ({
  x: p.x - p.width / 2,
  y: p.y - r,
  width: p.width,
  height: 2 * r,
});

function overview(
  numbered: NumberedPlace[],
  groups: number[][],
  bbox: BBox,
  v: { width: number; markerR: number; fontSize: number },
): MapView {
  const p = makeProjection(bbox, v.width);
  const xy = numbered.map((n) => p.project([n.place.lon, n.place.lat]));
  const grouped = new Set(groups.flat());
  const markers: Marker[] = numbered
    .map((n, i) => ({
      number: n.number,
      name: n.place.name,
      x: xy[i][0],
      y: xy[i][1],
      current: n.current,
    }))
    .filter((_, i) => !grouped.has(i));
  const pills: Pill[] = groups.map((g) => {
    const label = compressRanges(g.map((i) => numbered[i].number));
    const x = r1(g.reduce((s, i) => s + xy[i][0], 0) / g.length);
    const y = r1(g.reduce((s, i) => s + xy[i][1], 0) / g.length);
    const fb = insetBBox(g.map((i) => [numbered[i].place.lon, numbered[i].place.lat] as LonLat));
    const [x0, y0] = p.project([fb.minLon, fb.maxLat]);
    const [x1, y1] = p.project([fb.maxLon, fb.minLat]);
    return {
      label,
      numbers: g.map((i) => numbered[i].number),
      x,
      y,
      width: r1(Math.max(v.markerR * 2, label.length * v.fontSize * 0.62 + v.fontSize)),
      current: g.some((i) => numbered[i].current),
      frame: { x: x0, y: y0, width: r1(x1 - x0), height: r1(y1 - y0) },
    };
  });
  const cur = numbered.findIndex((n) => n.current);
  let here: MapView['here'] = null;
  if (cur >= 0) {
    const r = v.markerR;
    const pill = pills.find((pl) => pl.current);
    const anchor = pill ? pillBox(pill, r) : markerBox({ x: xy[cur][0], y: xy[cur][1] }, r);
    const obstacles = [
      ...markers.map((m) => markerBox(m, r)),
      ...pills.map((pl) => pillBox(pl, r)),
    ];
    here = hereLabel(anchor, v.fontSize, r, obstacles, p);
  }
  return {
    width: p.width,
    height: p.height,
    markerR: v.markerR,
    fontSize: v.fontSize,
    land: land(p),
    route: numbered.length > 1 ? 'M' + xy.map((c) => c.join(' ')).join('L') : null,
    markers,
    pills,
    labels: OVERVIEW_LABELS.map((l) => ({ text: l.text, xy: p.project(l.at), sea: l.sea }))
      .filter((l) => inside(p, l.xy, v.fontSize * 3, v.fontSize))
      .map((l) => ({ text: l.text, x: l.xy[0], y: l.xy[1], sea: l.sea })),
    here,
  };
}

function inset(numbered: NumberedPlace[], group: number[]): InsetView {
  const v = VARIANTS.inset;
  const members = group.map((i) => numbered[i]);
  const bbox = insetBBox(members.map((n) => [n.place.lon, n.place.lat]));
  const p = makeProjection(bbox, v.width);
  const raw = members.map((n) => {
    const [x, y] = p.project([n.place.lon, n.place.lat]);
    return { number: n.number, name: n.place.name, x, y, current: n.current };
  });
  const markers = spreadMarkers(raw, v.markerR * 2 + 4, p.width, p.height);
  const regions = new Set(members.map((n) => n.place.region).filter(Boolean));
  const countries = new Set(members.map((n) => n.place.country));
  const title =
    regions.size === 1 && members.every((n) => n.place.region)
      ? [...regions][0]!
      : countries.size === 1
        ? COUNTRY_NAMES[[...countries][0]]
        : 'México y Guatemala';
  const cur = markers.find((m) => m.current);
  const labels = INSET_LABELS.filter(
    (l) => !(l.country && countries.has(l.country) && countries.size === 1),
  )
    .map((l) => ({ ...l, xy: p.project(l.at) }))
    .filter((l) => inside(p, l.xy, 6, v.fontSize))
    .map((l) => {
      // Beschriftung am Rand ganz ins Bild schieben
      const half = (l.text.length * v.fontSize * 0.55) / 2 + 4;
      return {
        ...l,
        xy: [r1(Math.min(p.width - half, Math.max(half, l.xy[0]))), l.xy[1]] as [number, number],
      };
    })
    .filter((l) => markers.every((m) => Math.hypot(m.x - l.xy[0], m.y - l.xy[1]) > v.markerR * 2.5))
    .map((l) => ({ text: l.text, x: l.xy[0], y: l.xy[1], sea: !!l.sea }));
  return {
    title,
    numbers: members.map((m) => m.number),
    width: p.width,
    height: p.height,
    markerR: v.markerR,
    fontSize: v.fontSize,
    land: land(p),
    route: markers.length > 1 ? 'M' + markers.map((m) => `${m.x} ${m.y}`).join('L') : null,
    markers,
    pills: [],
    labels,
    here: cur
      ? hereLabel(
          markerBox(cur, v.markerR),
          v.fontSize,
          v.markerR,
          markers.map((m) => markerBox(m, v.markerR)),
          p,
        )
      : null,
  };
}

export function buildRouteMap(places: Place[]): RouteMap {
  const base = numberPlaces(places);
  const mobileBox = mobileBBox(places);
  const groupsIn = (bbox: BBox, width: number, threshold: number) => {
    const p = makeProjection(bbox, width);
    return clusterPoints(
      base.map((n) => p.project([n.place.lon, n.place.lat])),
      threshold,
    );
  };
  const groups = mergeGroups([
    ...groupsIn(DESKTOP_BBOX, VARIANTS.desktop.width, VARIANTS.desktop.cluster),
    ...groupsIn(mobileBox, VARIANTS.mobile.width, VARIANTS.mobile.cluster),
  ]);
  const insetIds = new Set(groups.flat().map((i) => places[i].id));
  const numbered = numberPlaces(places, insetIds);
  return {
    places: numbered,
    current: numbered[numbered.length - 1],
    desktop: overview(numbered, groups, DESKTOP_BBOX, VARIANTS.desktop),
    mobile: overview(numbered, groups, mobileBox, VARIANTS.mobile),
    insets: groups.map((g) => inset(numbered, g)),
  };
}
