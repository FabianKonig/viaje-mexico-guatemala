/**
 * Zentrale Einstellungen der Seite.
 * Platzhalter in eckigen Klammern werden vom Betreiber ersetzt (siehe TODO.md).
 * Der Name MUSS mit LICENSE und dem Impressum übereinstimmen (wird getestet).
 */
export const SITE = {
  title: 'Un viaje a México y Guatemala',
  shortTitle: 'Viaje MX·GT',
  description:
    'Mein Reisetagebuch aus México und Guatemala, auf Spanisch geschrieben, mit deutscher Übersetzung.',
  lang: 'de',
  ownerName: '[VOLLER NAME]',
  ownerStreet: '[STRASSE UND HAUSNUMMER]',
  ownerCity: '[PLZ ORT]',
  ownerEmail: '[E-MAIL]',
  copyrightYears: '2026–2027',
  palabritaUrl: 'https://palabrita.fabiankonig.de',
  timeZone: 'America/Mexico_City',
  /** Tag 1 der Reise (Datum ohne Uhrzeit). */
  tripStart: '2026-11-23',
  /** Erster Tag nach der Reise: ab hier gilt die Reise als beendet. */
  tripEnd: '2027-02-03',
} as const;

export const COPYRIGHT_LINE = `© ${SITE.copyrightYears} ${SITE.ownerName}. Alle Rechte vorbehalten.`;
