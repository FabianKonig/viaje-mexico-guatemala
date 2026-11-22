/**
 * Kleine EXIF-Hilfen ohne Abhängigkeiten.
 * exifHasGps(exifBuffer): true, wenn der EXIF-Block einen GPS-Verweis (Tag 0x8825) enthält.
 */
export function exifHasGps(exif) {
  if (!exif || exif.length < 14) return false;
  let off = 0;
  // sharp liefert den Block mit "Exif\0\0"-Präfix
  if (exif.subarray(0, 4).toString('latin1') === 'Exif') off = 6;
  const order = exif.subarray(off, off + 2).toString('latin1');
  const le = order === 'II';
  if (!le && order !== 'MM') return false;
  const u16 = (o) => (le ? exif.readUInt16LE(off + o) : exif.readUInt16BE(off + o));
  const u32 = (o) => (le ? exif.readUInt32LE(off + o) : exif.readUInt32BE(off + o));
  const ifd0 = u32(4);
  if (off + ifd0 + 2 > exif.length) return false;
  const count = u16(ifd0);
  for (let i = 0; i < count; i++) {
    const entry = ifd0 + 2 + i * 12;
    if (off + entry + 2 > exif.length) break;
    if (u16(entry) === 0x8825) return true;
  }
  return false;
}

/** Sucht in rohen Dateibytes nach Metadaten-Markern (EXIF, XMP, IPTC/Photoshop). */
export function rawMetadataMarkers(buf) {
  const found = [];
  const has = (s) => buf.includes(Buffer.from(s, 'latin1'));
  if (has('Exif\0\0')) found.push('EXIF');
  if (has('http://ns.adobe.com/xap/1.0/') || has('<x:xmpmeta')) found.push('XMP');
  if (has('Photoshop 3.0')) found.push('IPTC');
  if (has('GPSLatitude') || has('exif:GPS')) found.push('GPS');
  return found;
}
