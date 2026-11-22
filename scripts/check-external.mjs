#!/usr/bin/env node
/** Prüft, dass externe Ziele erreichbar sind (nur im nächtlichen Lauf, nicht bei jedem PR). */
const TARGETS = ['https://palabrita.fabiankonig.de'];

let failed = false;
for (const url of TARGETS) {
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(20_000),
    });
    console.log(`${res.ok ? '✓' : '✗'} ${url} → ${res.status}`);
    if (!res.ok) failed = true;
  } catch (e) {
    console.log(`✗ ${url} → ${e.message}`);
    failed = true;
  }
}
process.exit(failed ? 1 : 0);
