import { test, expect, PREVIEW_URL } from './fixtures';

// Testbeiträge (tests/fixtures/content), neueste zuerst; mehrere haben ein eigenes Datum.
const NEWEST = 'entradas/2026-12-03-gps-y-heic/';
const SECOND = 'entradas/2026-12-02-veinte-fotos/';
const MIDDLE = 'entradas/2026-11-30-solo-aleman/';
const OLDEST = 'entradas/2026-11-23-entrada-de-ejemplo/';
const AFTER_OLDEST = 'entradas/2026-11-24-titulo-muy-largo/';

const prevLink = (page: import('@playwright/test').Page) =>
  page.getByRole('navigation', { name: 'Weitere Beiträge' }).getByRole('link', {
    name: 'Vorheriger Beitrag',
  });
const nextLink = (page: import('@playwright/test').Page) =>
  page.getByRole('navigation', { name: 'Weitere Beiträge' }).getByRole('link', {
    name: 'Nächster Beitrag',
  });

test('Neuester Beitrag: nur „Vorheriger Beitrag“, führt zum älteren', async ({ page }) => {
  await page.goto(PREVIEW_URL + NEWEST);
  await expect(nextLink(page)).toHaveCount(0);
  await expect(prevLink(page)).toBeVisible();
  await prevLink(page).click();
  await expect(page).toHaveURL(new RegExp(`${SECOND}$`));
});

test('Ältester Beitrag: nur „Nächster Beitrag“, führt zum neueren', async ({ page }) => {
  await page.goto(PREVIEW_URL + OLDEST);
  await expect(prevLink(page)).toHaveCount(0);
  await expect(nextLink(page)).toBeVisible();
  await nextLink(page).click();
  await expect(page).toHaveURL(new RegExp(`${AFTER_OLDEST}$`));
});

test('Mittlerer Beitrag: beide Knöpfe, „Alle Beiträge“ bleibt darunter', async ({ page }) => {
  await page.goto(PREVIEW_URL + MIDDLE);
  const prev = prevLink(page);
  const next = nextLink(page);
  await expect(prev).toBeVisible();
  await expect(next).toBeVisible();
  const all = page.getByRole('link', { name: 'Alle Beiträge' });
  const [p, n, a] = await Promise.all([prev.boundingBox(), next.boundingBox(), all.boundingBox()]);
  // „Vorheriger“ liegt vor „Nächster“ (links bzw. darüber), „Alle Beiträge“ darunter
  expect(p!.y < n!.y || p!.x < n!.x).toBe(true);
  expect(a!.y).toBeGreaterThan(Math.max(p!.y, n!.y));
  // Knöpfe lassen sich mit dem Finger treffen (mindestens 44px hoch)
  expect(p!.height).toBeGreaterThanOrEqual(44);
  expect(n!.height).toBeGreaterThanOrEqual(44);
  // kein Überlauf nach rechts
  const vw = page.viewportSize()!.width;
  expect(n!.x + n!.width).toBeLessThanOrEqual(vw);
  await next.click();
  await expect(page).toHaveURL(/entradas\/2026-12-01-solo-espanol\/$/);
});

test('Echte Beiträge: neuester hat keinen „Nächster Beitrag“', async ({ page }) => {
  await page.goto('./');
  await page.locator('.post-card h3 a').first().click();
  await expect(nextLink(page)).toHaveCount(0);
});
