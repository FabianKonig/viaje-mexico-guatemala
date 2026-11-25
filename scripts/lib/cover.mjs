/**
 * Gezeichnetes Titelbild: macht aus einer SVG-Zeichnung ein JPEG (1600×1200, ohne Metadaten).
 * Die SVG darf nur selbst Gezeichnetes enthalten: kein `<text>` (ein Schriftzug muss aus Formen
 * gezeichnet sein), keine eingebetteten oder externen Bilder, keine Skripte. So hängt das Ergebnis
 * nicht von installierten Schriften ab und es kann nichts von außen nachgeladen werden.
 */
import sharp from 'sharp';

export const COVER_WIDTH = 1600;
export const COVER_HEIGHT = 1200;

/** Liefert Probleme der SVG (leer = in Ordnung). */
export function coverSvgProblems(svg) {
  const problems = [];
  if (!/<svg[\s>]/i.test(svg)) problems.push('keine SVG-Datei');
  if (/<text[\s>]/i.test(svg)) problems.push('<text> nicht erlaubt (Formen statt Schrift)');
  if (/<(image|script|foreignObject|use|style)[\s>/]/i.test(svg))
    problems.push('<image>, <script>, <foreignObject>, <use> und <style> sind nicht erlaubt');
  if (/(?:xlink:)?href\s*=\s*["'](?!#)/i.test(svg))
    problems.push('externe Verweise (href) nicht erlaubt');
  if (/url\(\s*["']?(?!#)/i.test(svg)) problems.push('externe Verweise (url()) nicht erlaubt');
  if (/@import/i.test(svg)) problems.push('@import nicht erlaubt');
  return problems;
}

/** SVG-Text → JPEG-Puffer (4:3, 1600×1200). Wirft bei Problemen. */
export async function renderCoverJpeg(svg) {
  const problems = coverSvgProblems(svg);
  if (problems.length) throw new Error('SVG nicht verwendbar: ' + problems.join('; '));
  return sharp(Buffer.from(svg), { density: 96 })
    .resize({ width: COVER_WIDTH, height: COVER_HEIGHT, fit: 'cover' })
    .flatten({ background: '#f6ebd9' })
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();
}
