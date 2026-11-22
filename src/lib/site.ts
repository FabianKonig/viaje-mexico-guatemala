import { normalizeBase, withBase } from './paths';

/** Basispfad dieses Builds (aus astro.config.mjs / BASE_PATH). */
export const BASE = normalizeBase(import.meta.env.BASE_URL);

/** Link innerhalb der Seite, berücksichtigt den Basispfad. */
export const href = (path = '') => withBase(BASE, path);
