import { test, expect, PREVIEW_URL } from './fixtures';

test('Startseite: Karte mit Ciudad de México als „Aquí estoy“ (Computer)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('./');
  const map = page.locator('#ruta');
  await expect(map.locator('svg.map--desktop')).toBeVisible();
  await expect(map.locator('svg.map--mobile')).toBeHidden();
  const legend = map.getByRole('list', { name: 'Besuchte Orte in Reihenfolge' });
  await expect(legend.locator('li').first()).toContainText('Ciudad de México');
  await expect(legend.locator('li.is-current')).toContainText('Aquí estoy');
  await expect(map.locator('svg.map--desktop [data-here]')).toContainText('Aquí estoy');
  await expect(map).toContainText('Schematische Skizze, die Umrisse sind nur ungefähr.');
});

test('Ortsnamen stehen nur in der Legende, nicht in der Karte', async ({ page }) => {
  await page.goto(PREVIEW_URL);
  const texts = await page.locator('#ruta svg text').allTextContents();
  const allowed = [
    'México',
    'Golfo de México',
    'Océano Pacífico',
    'Aquí estoy',
    'Belice',
    'Honduras',
    'El Salvador',
    'Mar Caribe',
  ];
  for (const t of texts.map((x) => x.trim())) {
    expect(allowed.includes(t) || /^[\d–, ]+$/.test(t), t).toBe(true);
  }
});

test('Testroute: Pillen, Ausschnitte und Legendenfarben', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(PREVIEW_URL);
  const map = page.locator('#ruta');
  await expect(map.locator('svg.map--desktop [data-pill]')).toHaveCount(3);
  await expect(map.locator('svg.map--desktop [data-pill="8–12"]')).toBeVisible();
  await expect(map.locator('[data-inset]')).toHaveCount(3);
  await expect(map.locator('[data-inset="Guatemala"] figcaption')).toHaveText(
    /Ausschnitt: Guatemala/,
  );
  await expect(map.locator('[data-inset="Guatemala"] [data-marker]')).toHaveCount(5);
  const inset = map.locator('[data-place="flores"] .legend__num');
  expect(await inset.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(
    'rgb(242, 169, 0)',
  );
  const cur = map.locator('li.is-current .legend__num');
  expect(await cur.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(179, 53, 99)');
  await expect(map.locator('li.is-current')).toContainText('Quetzaltenango');
});

for (const width of [320, 390]) {
  test(`Handy ${width}px: Südkarte mit Markern ≥ 28px, Ausschnitt darunter, Legende einspaltig`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto(PREVIEW_URL);
    const map = page.locator('#ruta');
    await expect(map.locator('svg.map--mobile')).toBeVisible();
    await expect(map.locator('svg.map--desktop')).toBeHidden();
    for (const dot of await map.locator('svg.map--mobile .marker__dot').all()) {
      const box = (await dot.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(28);
    }
    const ov = (await map.locator('svg.map--mobile').boundingBox())!;
    const ins = (await map.locator('[data-inset]').first().boundingBox())!;
    expect(ins.y).toBeGreaterThan(ov.y + ov.height - 1);
    const items = await map.locator('.legend li').all();
    const x0 = (await items[0].boundingBox())!.x;
    const x1 = (await items[1].boundingBox())!.x;
    expect(x1).toBe(x0);
    const fontPx = await map
      .locator('svg.map--mobile .num')
      .first()
      .evaluate((el) => (el as SVGTextElement).getBoundingClientRect().height);
    expect(fontPx).toBeGreaterThanOrEqual(12);
  });
}
