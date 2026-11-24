/**
 * Videohilfen (ffmpeg/ffprobe): Prüfen, Verkleinern, Standbild, Metadaten-Prüfung.
 * ffmpeg wird nur beim Import (scripts/import-media.mjs) und in Tests gebraucht, nie beim Build.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import sharp from 'sharp';

/** Kürzere Seite höchstens so viele Pixel (720p). */
export const MAX_SHORT_SIDE = 720;
export const MAX_FPS = 30;
/** Längste erlaubte Dauer und größte erlaubte Datei pro Clip. */
export const MAX_CLIP_SECONDS = 180;
export const MAX_CLIP_BYTES = 40 * 1024 * 1024;
export const VIDEO_EXT = /\.(mp4|m4v|mov|3gp|webm|mkv)$/i;

export function hasFfmpeg() {
  try {
    for (const tool of ['ffmpeg', 'ffprobe']) execFileSync(tool, ['-version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function rotationOf(stream) {
  const side = (stream.side_data_list ?? []).find((s) => s.rotation !== undefined);
  const r = side ? Number(side.rotation) : Number(stream.tags?.rotate ?? 0);
  return Number.isFinite(r) ? r : 0;
}

function fpsOf(stream) {
  const [a, b] = String(stream.avg_frame_rate || stream.r_frame_rate || '0/1')
    .split('/')
    .map(Number);
  return b ? a / b : 0;
}

/** Liest Maße (nach Drehung), Dauer, Bildrate und Tonspur eines Videos. */
export function probeVideo(file) {
  const out = execFileSync(
    'ffprobe',
    ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file],
    { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
  );
  const info = JSON.parse(out);
  const v = (info.streams ?? []).find((s) => s.codec_type === 'video');
  if (!v) throw new Error('keine Videospur gefunden');
  let { width, height } = v;
  if (Math.abs(rotationOf(v)) % 180 === 90) [width, height] = [height, width];
  return {
    width,
    height,
    duration: Number(info.format?.duration ?? v.duration ?? 0),
    fps: fpsOf(v),
    hasAudio: (info.streams ?? []).some((s) => s.codec_type === 'audio'),
  };
}

/** Zielgröße: kürzere Seite höchstens 720 px, nie vergrößern, gerade Zahlen. */
export function targetSize(width, height, maxShort = MAX_SHORT_SIDE) {
  const short = Math.min(width, height);
  const f = short > maxShort ? maxShort / short : 1;
  const even = (n) => Math.max(2, Math.round((n * f) / 2) * 2);
  return { width: even(width), height: even(height) };
}

/** Argumente für ffmpeg: H.264/AAC, 720p, schneller Start, ohne Metadaten (auch GPS). */
export function ffmpegArgs(input, output, info) {
  const { width, height } = targetSize(info.width, info.height);
  const filters = [`scale=${width}:${height}`];
  if (info.fps > MAX_FPS + 0.5) filters.push(`fps=${MAX_FPS}`);
  const args = [
    '-v',
    'error',
    '-y',
    '-i',
    input,
    '-map',
    '0:v:0',
    ...(info.hasAudio ? ['-map', '0:a:0'] : []),
    '-vf',
    filters.join(','),
    '-c:v',
    'libx264',
    '-profile:v',
    'main',
    '-pix_fmt',
    'yuv420p',
    '-preset',
    'medium',
    '-crf',
    '28',
    '-maxrate',
    '2500k',
    '-bufsize',
    '5000k',
  ];
  if (info.hasAudio) args.push('-c:a', 'aac', '-b:a', '96k', '-ac', '2');
  args.push(
    '-map_metadata',
    '-1',
    '-map_chapters',
    '-1',
    '-fflags',
    '+bitexact',
    '-flags:v',
    '+bitexact',
    '-flags:a',
    '+bitexact',
    '-movflags',
    '+faststart',
    output,
  );
  return args;
}

/** Wandelt ein Video um (siehe ffmpegArgs). Wirft bei Fehlern mit dem Ende der ffmpeg-Meldung. */
export function transcodeVideo(input, output, info) {
  const r = spawnSync('ffmpeg', ffmpegArgs(input, output, info), { encoding: 'utf8' });
  if (r.status !== 0) {
    const tail = String(r.stderr || r.error?.message || '')
      .trim()
      .split('\n')
      .slice(-3)
      .join(' | ');
    throw new Error(`ffmpeg ist fehlgeschlagen: ${tail}`);
  }
}

/** Standbild (JPEG, 800 px breit, ohne Metadaten) aus dem fertigen Video. */
export async function posterFrom(file, duration) {
  const at = Math.min(1, Math.max(0, duration / 2));
  const r = spawnSync(
    'ffmpeg',
    [
      '-v',
      'error',
      '-ss',
      String(at),
      '-i',
      file,
      '-frames:v',
      '1',
      '-f',
      'image2pipe',
      '-vcodec',
      'png',
      '-',
    ],
    { maxBuffer: 64 * 1024 * 1024 },
  );
  if (r.status !== 0 || !r.stdout?.length) throw new Error('Standbild konnte nicht erzeugt werden');
  return sharp(r.stdout)
    .resize({ width: 800, withoutEnlargement: true })
    .jpeg({ quality: 78, mozjpeg: true })
    .toBuffer();
}

/**
 * Prüft die Bytes einer MP4-Datei auf Standort und andere Metadaten. Liefert Probleme (leer = sauber).
 * Erkannt werden: Standort-Atome (©xyz, loci), ISO-6709-Koordinaten, Android/Apple-Metadatenschlüssel.
 */
export function mp4Problems(buf) {
  const problems = [];
  if (buf.length < 12 || buf.toString('latin1', 4, 8) !== 'ftyp') problems.push('keine MP4-Datei');
  if (buf.includes(Buffer.from([0xa9, 0x78, 0x79, 0x7a]))) problems.push('Standort (©xyz)');
  if (buf.includes(Buffer.from('loci', 'latin1'))) problems.push('Standort (loci)');
  const text = buf.toString('latin1');
  if (/[+-]\d{1,2}\.\d{2,}[+-]\d{1,3}\.\d{2,}/.test(text)) problems.push('GPS-Koordinaten');
  if (text.includes('com.apple.quicktime.location')) problems.push('Standort (Apple)');
  if (text.includes('mdta')) problems.push('Metadatenschlüssel');
  return [...new Set(problems)];
}
