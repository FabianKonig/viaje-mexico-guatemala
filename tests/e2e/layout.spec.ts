import { test, expect, latestRealPost, PREVIEW_URL } from './fixtures';
import type { Page } from '@playwright/test';

const WIDTHS = [320, 390, 768, 1280, 1920, 2560];

async function checkLayout(page: Page, width: number) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth, `horizontaler Überlauf bei ${width}px`).toBeLessThanOrEqual(clientWidth);

  // Profilbild in der rechten oberen Ecke, auf einer Zeile mit dem Titel
  const avatar = (await page.locator('.avatar').boundingBox())!;
  const title = (await page.locator('.site-title').boundingBox())!;
  const header = (await page.locator('.site-header').boundingBox())!;
  const padRight = await page
    .locator('.site-header')
    .evaluate((el) => parseFloat(getComputedStyle(el).paddingRight));
  // rechte obere Ecke des Kopfbereichs (der bis 1200px Breite der ganzen Seite entspricht)
  expect(
    Math.abs(avatar.x + avatar.width - (header.x + header.width - padRight)),
    'Profilbild rechts',
  ).toBeLessThanOrEqual(1);
  if (clientWidth < 1200) expect(avatar.x + avatar.width).toBeGreaterThan(clientWidth - 64);
  expect(avatar.x, 'Profilbild rechts vom Titel').toBeGreaterThanOrEqual(title.x + title.width - 1);
  expect(avatar.y, 'Profilbild oben').toBeLessThan(title.y + 20);

  // Kein Element ragt aus Karten heraus
  const overflowing = await page.evaluate(
    () =>
      [...document.querySelectorAll('.card, .post-card, .palabrita')].filter(
        (el) => el.scrollWidth > el.clientWidth + 1,
      ).length,
  );
  expect(overflowing, 'Inhalt läuft über Kartenränder').toBe(0);
}

for (const width of WIDTHS) {
  test(`Startseite bei ${width}px: kein Überlauf, Profilbild rechts oben`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('./');
    await checkLayout(page, width);
  });

  test(`Beitragsseiten bei ${width}px: kein Überlauf, Profilbild rechts oben`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const url of [
      latestRealPost().url,
      './datenschutz/',
      './lizenzhinweise/',
      PREVIEW_URL + 'entradas/2026-11-24-titulo-muy-largo/',
      PREVIEW_URL + 'entradas/2026-11-25-texto-largo/',
    ]) {
      await page.goto(url);
      await checkLayout(page, width);
    }
  });

  test(`Grenzfälle (lange Titel/Texte) bei ${width}px: kein Überlauf`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(PREVIEW_URL);
    await checkLayout(page, width);
  });
}

test('Zoom 200 % (entspricht 640px Breite bei 1280px): kein Überlauf', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 450 });
  await page.goto('./');
  await checkLayout(page, 640);
});

test('vergrößerte Systemschrift (24px Grundschrift): kein Überlauf', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  await page.addStyleTag({ content: 'html{font-size:150%}' });
  await checkLayout(page, 390);
});
