/**
 * Zentrale Einstellungen der Seite.
 * Der Name MUSS mit LICENSE und dem Impressum übereinstimmen (wird getestet).
 */
export const SITE = {
  title: 'Un viaje a México y Guatemala',
  shortTitle: 'Viaje MX·GT',
  description:
    'Mein Reisetagebuch aus México und Guatemala, auf Spanisch geschrieben, mit deutscher Übersetzung.',
  lang: 'de',
  ownerName: 'Fabian König',
  ownerStreet: 'Sandweg 34',
  ownerCity: '60316 Frankfurt am Main',
  ownerEmail: 'palabrita.fk@mailbox.org',
  copyrightYears: '2026–2027',
  palabritaUrl: 'https://palabrita.fabiankonig.de',
  timeZone: 'America/Mexico_City',
  /** Tag 1 der Reise (Datum ohne Uhrzeit). */
  tripStart: '2026-11-23',
  /** Erster Tag nach der Reise: ab hier gilt die Reise als beendet. */
  tripEnd: '2027-02-03',
} as const;

export const COPYRIGHT_LINE = `© ${SITE.copyrightYears} ${SITE.ownerName}. Alle Rechte vorbehalten.`;
