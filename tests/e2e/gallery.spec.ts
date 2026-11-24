import { test, expect, expectNoProblems, PREVIEW_URL } from './fixtures';

const EXAMPLE = PREVIEW_URL + 'entradas/2026-11-23-entrada-de-ejemplo/';
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
  await page.goto(PREVIEW_URL);
  const card = page.locator('.post-card', { hasText: 'Veinte fotos' });
  await expect(card.locator('.post-card__img')).toBeVisible();
  await expect(card).toContainText('20 Fotos');
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
  expect(links).toHaveLength(3); // GPS-Foto, HEIC-Foto, Bewegtfoto
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

test.describe('Videos (Clips)', () => {
  const URL = PREVIEW_URL + 'entradas/2026-12-03-gps-y-heic/';

  test('Standbild vorab, Video erst nach dem Abspielen, Ton nicht stumm', async ({ page }) => {
    // Nur echte Antworten zählen: Playwright-WebKit meldet für Videoelemente auch Scheinanfragen
    // (Status 0, ohne Header), die den Server nie erreichen.
    const mp4: string[] = [];
    page.on('response', (r) => {
      if (/\.mp4(\?|$)/.test(r.url()) && r.status() >= 200) mp4.push(r.url());
    });
    await page.goto(URL);
    await page.waitForLoadState('networkidle');
    const video = page.locator('video.clip__video');
    await expect(video).toHaveCount(1);
    await expect(video).toHaveAttribute('preload', 'none');
    await expect(video).toHaveAttribute('poster', /-poster\.jpg$/);
    await expect(video).toHaveAttribute('controls', '');
    await expect(video).toHaveAttribute('aria-label', /Testclip/);
    expect(await video.evaluate((v: HTMLVideoElement) => v.muted)).toBe(false);
    expect(await video.evaluate((v: HTMLVideoElement) => v.autoplay)).toBe(false);
    // Vor dem Abspielen wird die Videodatei nicht geladen.
    expect(mp4).toEqual([]);
    await expect(page.locator('.clip__title')).toHaveText(/Testclip/);
    // Nach dem Abspielen wird sie angefragt (Chromium ohne H.264 kann sie nicht dekodieren).
    await video.evaluate((v: HTMLVideoElement) => v.play().catch(() => undefined));
    await expect.poll(() => mp4.length).toBeGreaterThan(0);
  });

  test('Videodatei hat keinen Standort und wird in Teilen abrufbar geliefert', async ({
    page,
    request,
  }) => {
    await page.goto(URL);
    const src = await page.locator('video.clip__video source').getAttribute('src');
    const url = new globalThis.URL(src!, page.url()).toString();
    const part = await request.get(url, { headers: { Range: 'bytes=0-99' } });
    expect(part.status()).toBe(206);
    expect((await part.body()).length).toBe(100);
    const body = await (await request.get(url)).body();
    expect(body.includes(Buffer.from([0xa9, 0x78, 0x79, 0x7a]))).toBe(false);
    expect(body.subarray(4, 8).toString('latin1')).toBe('ftyp');
  });

  test.describe('ohne JavaScript', () => {
    test.use({ javaScriptEnabled: false });
    test('Video mit Bedienelementen und Download-Link ist vorhanden', async ({ page }) => {
      await page.goto(URL);
      await expect(page.locator('video.clip__video[controls]')).toHaveCount(1);
    });
  });
});

test.describe('Bewegtfoto in der Galerie', () => {
  const URL = PREVIEW_URL + 'entradas/2026-12-03-gps-y-heic/';
  // Nur echte Antworten zählen (WebKit meldet Scheinanfragen ohne Status, siehe Clip-Test oben).
  const isMotion = (u: string) => /-motion\.mp4(\?|$)/.test(u);

  test('Schleife ist unsichtbar, stumm und startet erst im Bild; Standbild bleibt Link zur Lightbox', async ({
    page,
  }) => {
    const loaded: string[] = [];
    page.on('response', (r) => {
      if (isMotion(r.url()) && r.status() >= 200) loaded.push(r.url());
    });
    await page.goto(URL);
    const video = page.locator('video[data-motion]');
    await expect(video).toHaveCount(1);
    for (const [attr, value] of [
      ['muted', ''],
      ['loop', ''],
      ['playsinline', ''],
      ['preload', 'none'],
      ['aria-hidden', 'true'],
    ] as const)
      await expect(video, attr).toHaveAttribute(attr, value);
    await expect(video).not.toHaveAttribute('autoplay', /.*/);
    await expect(video).not.toHaveAttribute('controls', /.*/);
    // Standbild ist im selben Link und ist das Bild mit Alt-Text
    await expect(page.locator('a[data-lightbox-item]:has(video[data-motion]) img')).toHaveAttribute(
      'alt',
      /Bewegtfoto/,
    );
    // Beim Hineinscrollen wird die Schleife angefragt (Chromium ohne H.264 kann sie nur nicht abspielen).
    await page.locator('a[data-lightbox-item]:has(video[data-motion])').scrollIntoViewIfNeeded();
    await expect.poll(() => loaded.length).toBeGreaterThan(0);
  });

  test.describe('„Bewegung reduzieren“', () => {
    test.use({ reducedMotion: 'reduce' });
    test('lädt und zeigt keine Schleife, nur das Standbild', async ({ page }) => {
      const loaded: string[] = [];
      page.on('response', (r) => {
        if (isMotion(r.url()) && r.status() >= 200) loaded.push(r.url());
      });
      await page.goto(URL);
      await page.locator('a[data-lightbox-item]:has(video[data-motion])').scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      expect(loaded).toEqual([]);
      await expect(page.locator('video[data-motion]')).not.toHaveAttribute('data-playing', /.*/);
    });
  });

  test.describe('ohne JavaScript', () => {
    test.use({ javaScriptEnabled: false });
    test('nur das Standbild ist sichtbar', async ({ page }) => {
      await page.goto(URL);
      await expect(page.locator('video[data-motion]')).not.toHaveAttribute('data-playing', /.*/);
      await expect(page.locator('.gallery__grid img').nth(2)).toBeVisible();
    });
  });
});
