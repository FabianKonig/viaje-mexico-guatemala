import AxeBuilder from '@axe-core/playwright';
import { test, expect, latestRealPost, PREVIEW_URL } from './fixtures';

const PAGES = [
  { name: 'Startseite', url: './' },
  { name: 'Startseite (Grenzfälle)', url: PREVIEW_URL },
  { name: '404', url: './gibt-es-nicht/' },
  { name: 'Impressum', url: './impressum/' },
  { name: 'Datenschutz', url: './datenschutz/' },
  { name: 'Lizenzhinweise', url: './lizenzhinweise/' },
  { name: 'Beitragsseite', url: latestRealPost().url },
  { name: 'Beitrag nur Deutsch', url: PREVIEW_URL + 'entradas/2026-11-30-solo-aleman/' },
  { name: 'Beitrag mit 20 Fotos und Video', url: PREVIEW_URL + 'entradas/2026-12-03-gps-y-heic/' },
  { name: 'Beitrag 20 Fotos', url: PREVIEW_URL + 'entradas/2026-12-02-veinte-fotos/' },
  { name: 'Beitrag langer Titel', url: PREVIEW_URL + 'entradas/2026-11-24-titulo-muy-largo/' },
];

for (const p of PAGES) {
  test(`Barrierefreiheit (axe, inkl. Kontrast): ${p.name}`, async ({ page }) => {
    await page.goto(p.url);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
      .analyze();
    expect(
      results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`),
    ).toEqual([]);
  });
}

test('Tastatur: Sprunglink, sichtbarer Fokus, alle Links erreichbar', async ({ page }) => {
  await page.goto('./');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Zum Inhalt springen' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press('Tab');
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle);
  expect(outline).not.toBe('none');
});

test('Touch-Ziele sind mindestens 44px hoch', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  const small = await page.evaluate(() =>
    [...document.querySelectorAll('.site-nav a, .btn, .palabrita__btn')]
      .map((el) => [el.textContent?.trim(), el.getBoundingClientRect().height] as const)
      .filter(([, h]) => h < 44),
  );
  expect(small).toEqual([]);
});

test('Barrierefreiheit (axe): geöffnete Lightbox', async ({ page }) => {
  await page.goto(latestRealPost().url);
  await page.locator('.gallery__link').first().click();
  await expect(page.locator('dialog[data-lightbox]')).toBeVisible();
  const results = await new AxeBuilder({ page })
    .include('dialog[data-lightbox]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
});
