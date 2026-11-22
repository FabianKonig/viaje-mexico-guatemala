#!/usr/bin/env node
/**
 * Erzeugt die App-Icons (eigenes Motiv: Papel-Picado-Wimpel auf Marigold) als PNG ohne Metadaten.
 * Einmalig bzw. bei Designänderungen ausführen: node scripts/make-icons.mjs  (Ergebnis wird eingecheckt)
 */
import fs from 'node:fs';
import sharp from 'sharp';

const INK = '#2B1D16';
const flag = (x, y, w, h, color) => {
  const zig = Array.from(
    { length: 4 },
    (_, k) =>
      `L${x + w - (w / 4) * k - w / 8} ${y + h + w / 7} L${x + w - (w / 4) * (k + 1)} ${y + h}`,
  ).join(' ');
  const hole = (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#F2A900"/>`;
  return `<path d="M${x} ${y} H${x + w} V${y + h} ${zig} Z" fill="${color}" stroke="${INK}" stroke-width="${w * 0.045}" stroke-linejoin="round"/>
    ${hole(x + w * 0.26, y + h * 0.33, w * 0.075)}${hole(x + w * 0.74, y + h * 0.33, w * 0.075)}
    <path d="M${x + w / 2} ${y + h * 0.18} l${w * 0.11} ${h * 0.17} -${w * 0.11} ${h * 0.17} -${w * 0.11} -${h * 0.17}z" fill="#F2A900"/>
    ${hole(x + w * 0.28, y + h * 0.72, w * 0.05)}${hole(x + w * 0.5, y + h * 0.75, w * 0.05)}${hole(x + w * 0.72, y + h * 0.72, w * 0.05)}`;
};

/** safe = Anteil der Fläche, in dem das Motiv liegt (maskable: 0.62) */
function svg(size, { safe = 0.8, rounded = true } = {}) {
  const s = size;
  const m = (s * (1 - safe)) / 2;
  const inner = s * safe;
  const fw = inner * 0.56;
  const fh = inner * 0.5;
  const fx = m + (inner - fw) / 2;
  const fy = m + inner * 0.3;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <rect width="${s}" height="${s}" ${rounded ? `rx="${s * 0.22}"` : ''} fill="#F2A900"/>
  <line x1="${m}" y1="${fy}" x2="${s - m}" y2="${fy}" stroke="${INK}" stroke-width="${inner * 0.035}" stroke-linecap="round"/>
  ${flag(fx, fy, fw, fh, '#D4457A')}
</svg>`;
}

const out = 'public/icons';
fs.mkdirSync(out, { recursive: true });
const jobs = [
  ['icon-192.png', 192, { safe: 0.86 }],
  ['icon-512.png', 512, { safe: 0.86 }],
  ['icon-maskable-512.png', 512, { safe: 0.62, rounded: false }],
  ['apple-touch-icon.png', 180, { safe: 0.78, rounded: false }],
  ['favicon-32.png', 32, { safe: 0.98 }],
];
for (const [name, size, opts] of jobs) {
  await sharp(Buffer.from(svg(size, opts)))
    .png({ compressionLevel: 9 })
    .toFile(`${out}/${name}`);
}
fs.writeFileSync('public/favicon.svg', svg(64, { safe: 0.98 }).replace(/\n\s*/g, ''));
console.log('Icons erzeugt:', jobs.map((j) => j[0]).join(', '), '+ favicon.svg');
