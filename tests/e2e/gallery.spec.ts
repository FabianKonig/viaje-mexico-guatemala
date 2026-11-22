import { test, expect, expectNoProblems, PREVIEW_URL } from './fixtures';

const EXAMPLE = './entradas/2026-11-23-entrada-de-ejemplo/';
const TWENTY = PREVIEW_URL + 'entradas/2026-12-02-veinte-fotos/';

test('Galerie: Vorschaubilder mit Lazy Loading, festen Maßen und Alt-Text', async ({
  page,
  problems,
}) => {
  await page.goto(TWENTY);
  const imgs = page.locator('.gallery__grid img');
  await expect(imgs).toHaveCount(20);
  for (const img of await imgs.all()) {
    await expect(img).toHaveAttribute('alt', /.+/);
    await expect(img).toHaveAttribute('width', /\d+/);
    await expect(img).toHaveAttribute('height', /\d+/);
  }
  await expect(imgs.nth(19)).toHaveAttribute('loading', 'lazy');
  // große Versionen werden erst bei Bedarf geladen
  const requested: string[] = [];
  page.on('request', (r) => requested.push(r.url()));
  await page.reload();
  await page.waitForLoadState('networkidle');
  expect(requested.filter((u) => u.includes('-1600.webp'))).toEqual([]);
  expectNoProblems(problems);
});

test('Lightbox: öffnen, blättern, schließen per Maus', async ({ page }) => {
  await page.goto(EXAMPLE);
  const dialog = page.locator('dialog[data-lightbox]');
  await page.locator('.gallery__link').nth(1).click();
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('[data-count]')).toHaveText('2 / 3');
  await expect(dialog.locator('[data-img]')).toHaveAttribute('src', /-1600\.webp$/);
  await expect(dialog.locator('[data-img]')).toHaveAttribute('alt', /Kaktus/);
  await dialog.getByRole('button', { name: 'Nächstes Foto' }).click();
  await expect(dialog.locator('[data-count]')).toHaveText('3 / 3');
  await expect(dialog.locator('[data-caption]')).toHaveText('Casas de colores');
  await dialog.getByRole('button', { name: 'Nächstes Foto' }).click();
  await expect(dialog.locator('[data-count]')).toHaveText('1 / 3');
  await dialog.getByRole('button', { name: 'Vorheriges Foto' }).click();
  await expect(dialog.locator('[data-count]')).toHaveText('3 / 3');
  await dialog.getByRole('button', { name: 'Schließen' }).click();
  await expect(dialog).toBeHidden();
  // Fokus kehrt zum auslösenden Foto zurück
  await expect(page.locator('.gallery__link').nth(1)).toBeFocused();
});

test('Lightbox: Tastatur (Enter, Pfeiltasten, Esc), Fokus bleibt im Dialog', async ({ page }) => {
  await page.goto(EXAMPLE);
  const dialog = page.locator('dialog[data-lightbox]');
  await page.locator('.gallery__link').first().focus();
  await page.keyboard.press('Enter');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Schließen' })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(dialog.locator('[data-count]')).toHaveText('2 / 3');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(dialog.locator('[data-count]')).toHaveText('3 / 3');
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Tab');
    const inside = await page.evaluate(
      () =>
        !!document.activeElement?.closest('dialog[data-lightbox]') ||
        document.activeElement === document.body,
    );
    expect(inside).toBe(true);
  }
  // Seite hinter dem Dialog ist inaktiv
  await expect(page.locator('main')).toHaveJSProperty('inert', false);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.locator('.gallery__link').first()).toBeFocused();
});

test('Lightbox: Wischen am Handy', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(EXAMPLE);
  const dialog = page.locator('dialog[data-lightbox]');
  await page.locator('.gallery__link').first().click();
  await expect(dialog.locator('[data-count]')).toHaveText('1 / 3');
  const stage = dialog.locator('[data-stage]');
  const swipe = async (from: number, to: number) => {
    await stage.dispatchEvent('pointerdown', {
      pointerType: 'touch',
      clientX: from,
      clientY: 400,
      isPrimary: true,
    });
    await stage.dispatchEvent('pointerup', {
      pointerType: 'touch',
      clientX: to,
      clientY: 410,
      isPrimary: true,
    });
  };
  await swipe(300, 80); // nach links → nächstes
  await expect(dialog.locator('[data-count]')).toHaveText('2 / 3');
  await swipe(80, 300); // nach rechts → vorheriges
  await expect(dialog.locator('[data-count]')).toHaveText('1 / 3');
  await expect(dialog).toBeVisible();
  // Dialog füllt den sichtbaren Bereich (iPhone: kein 100vh-Problem)
  const box = (await dialog.boundingBox())!;
  expect(Math.round(box.height)).toBe(844);
});

test('Beitragskarte zeigt Foto und Fotoanzahl', async ({ page }) => {
  await page.goto('./');
  const card = page.locator('.post-card').first();
  await expect(card.locator('.post-card__img')).toBeVisible();
  await expect(card).toContainText('3 Fotos');
});

test('Beitrag ohne Fotos hat keine Galerie', async ({ page }) => {
  await page.goto(PREVIEW_URL + 'entradas/2026-11-26-sin-lugar/');
  await expect(page.locator('.gallery')).toHaveCount(0);
});

test('veröffentlichte Fotos (auch aus GPS- und HEIC-Originalen) sind ohne Metadaten', async ({
  page,
  request,
}) => {
  await page.goto(PREVIEW_URL + 'entradas/2026-12-03-gps-y-heic/');
  const links = await page
    .locator('.gallery__link')
    .evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).href));
  expect(links).toHaveLength(2);
  for (const url of links) {
    const body = await (await request.get(url)).body();
    expect(body.includes(Buffer.from('Exif\0\0', 'latin1')), url).toBe(false);
    expect(body.includes(Buffer.from('GPS', 'latin1')), url).toBe(false);
  }
});

test.describe('ohne JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('Fotos sind sichtbar und verlinken auf die große Version', async ({ page }) => {
    await page.goto(EXAMPLE);
    await expect(page.locator('.gallery__grid img').first()).toBeVisible();
    await expect(page.locator('.gallery__link').first()).toHaveAttribute('href', /-1600\.webp$/);
  });
});

test.describe('Videos (Zwei-Klick-Lösung)', () => {
  const URL = PREVIEW_URL + 'entradas/2026-12-03-gps-y-heic/';
  test('keine Anfrage an YouTube vor dem Klick, youtube-nocookie nach dem Klick', async ({
    page,
  }) => {
    const external: string[] = [];
    page.on('request', (r) => {
      if (!r.url().startsWith('http://127.0.0.1')) external.push(r.url());
    });
    await page.route(/youtube/, (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<p>Testvideo</p>' }),
    );
    await page.goto(URL);
    await page.waitForLoadState('networkidle');
    expect(external).toEqual([]);
    await expect(page.locator('.video iframe')).toHaveCount(0);
    await page.getByRole('button', { name: 'Video laden' }).click();
    const iframe = page.locator('.video iframe');
    await expect(iframe).toHaveAttribute(
      'src',
      /^https:\/\/www\.youtube-nocookie\.com\/embed\/aaaaaaaaaaa/,
    );
    await expect(iframe).toHaveAttribute('title', 'Testvideo');
  });
});
