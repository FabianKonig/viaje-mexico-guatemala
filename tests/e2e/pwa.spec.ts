import { test, expect, latestRealPost, PREVIEW_URL } from './fixtures';

test('Manifest ist verlinkt und gültig', async ({ page, request }) => {
  await page.goto('./');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  const res = await request.get(new URL(href!, page.url()).toString());
  expect(res.headers()['content-type']).toContain('application/manifest+json');
  const m = await res.json();
  expect(m).toMatchObject({
    name: 'Un viaje a México y Guatemala',
    start_url: './',
    scope: './',
    display: 'standalone',
  });
  for (const icon of m.icons)
    expect((await request.get(new URL(icon.src, res.url()).toString())).ok()).toBe(true);
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    'href',
    /apple-touch-icon\.png$/,
  );
  await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute(
    'content',
    /.+/,
  );
});

test.describe('Service Worker', () => {
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'Service-Worker-Details werden in Chromium geprüft',
  );

  test('wird registriert, löscht alte Caches desselben Basispfads, Seiten offline verfügbar', async ({
    page,
    context,
  }) => {
    // alte Caches anlegen, bevor der Service Worker installiert wird
    await page.goto('./favicon.svg');
    await page.evaluate(async () => {
      await caches.open('viaje:/:pages-alt');
      await caches.open('viaje:/pr-preview/pr-9/:pages-alt');
      await caches.open('fremd');
    });
    await page.goto('./');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await expect
      .poll(() => page.evaluate(() => caches.keys()))
      .toEqual(expect.arrayContaining(['viaje:/pr-preview/pr-9/:pages-alt', 'fremd']));
    const keys = await page.evaluate(() => caches.keys());
    expect(keys).not.toContain('viaje:/:pages-alt');
    expect(keys.some((k) => /^viaje:\/:pages-/.test(k))).toBe(true);

    // Beitrag besuchen (jetzt vom Service Worker kontrolliert)
    await page.reload();
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    const post = latestRealPost();
    await page.goto(post.url);
    await expect(page.locator('h1')).toBeVisible();

    await context.setOffline(true);
    await page.goto(post.url);
    await expect(page.locator('h1')).toHaveText(post.title);
    await page.goto('./');
    await expect(page.locator('h1')).toHaveText('Un viaje a México y Guatemala');
    await page.goto('./noch-nie-besucht/');
    await expect(page.getByRole('heading', { name: 'Gerade offline' })).toBeVisible();
    await context.setOffline(false);
  });

  test('Vorschau-Pfade registrieren keinen Service Worker', async ({ page }) => {
    await page.goto(PREVIEW_URL);
    await page.waitForLoadState('load');
    await page.waitForTimeout(300);
    expect(
      await page.evaluate(() => navigator.serviceWorker.getRegistrations().then((r) => r.length)),
    ).toBe(0);
  });
});
