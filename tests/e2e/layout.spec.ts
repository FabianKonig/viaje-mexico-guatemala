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

for (const width of [390, 1280]) {
  test(`Beitragsseite bei ${width}px: genau drei Schriftgrößen, Überschrift > Titel > Text`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(PREVIEW_URL + 'entradas/2026-12-02-veinte-fotos/');
    const { sizes, heading, title, text } = await page.evaluate(() => {
      const px = (el: Element) => parseFloat(getComputedStyle(el).fontSize);
      const sizes = new Set<number>();
      for (const el of document.querySelectorAll('body *')) {
        const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent?.trim());
        if (hasText && !el.closest('svg') && (el as HTMLElement).offsetParent) sizes.add(px(el));
      }
      return {
        sizes: [...sizes],
        heading: px(document.querySelector('.site-title')!),
        title: px(document.querySelector('.post__title')!),
        text: px(document.querySelector('.original')!),
      };
    });
    expect(sizes.length, `Schriftgrößen: ${sizes.join(', ')}`).toBeLessThanOrEqual(3);
    expect(heading).toBeGreaterThan(title);
    expect(title).toBeGreaterThan(text);
  });
}

test('Beitragsseite: Tag und Datum stehen am Handy in einer eigenen Zeile, am Computer neben dem Ort', async ({
  page,
}) => {
  const url = PREVIEW_URL + 'entradas/2026-12-02-veinte-fotos/';
  const tops = () =>
    page.evaluate(() => {
      const top = (s: string) => document.querySelector(s)!.getBoundingClientRect().top;
      return { place: top('.post__meta [lang="es"]'), when: top('.post__when') };
    });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url);
  const mobile = await tops();
  expect(mobile.when, 'Handy: Datum in der nächsten Zeile').toBeGreaterThan(mobile.place + 10);
  await page.setViewportSize({ width: 1280, height: 800 });
  const desktop = await tops();
  expect(Math.abs(desktop.when - desktop.place), 'Computer: gleiche Zeile').toBeLessThan(5);
});
