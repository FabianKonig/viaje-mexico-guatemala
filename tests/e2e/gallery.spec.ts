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

test('veröffentlichte Fotos (auch aus GPS- und HEIC-Originalen) haben kein XMP, IPTC und keine Metadaten in den Vorschaubildern', async ({
  page,
  request,
}) => {
  await page.goto(PREVIEW_URL + 'entradas/2026-12-03-gps-y-heic/');
  const links = await page
    .locator('.gallery__link')
    .evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).href));
  expect(links).toHaveLength(3); // GPS-Foto, HEIC-Foto, Bewegtfoto
  // große Bilder: EXIF (Kamera, Standort) erlaubt, aber nie XMP oder IPTC
  for (const url of links) {
    const body = await (await request.get(url)).body();
    expect(body.includes(Buffer.from('http://ns.adobe.com/xap', 'latin1')), url).toBe(false);
    expect(body.includes(Buffer.from('Photoshop 3.0', 'latin1')), url).toBe(false);
  }
  // Vorschaubilder: ohne jede Metadaten
  const thumbs = await page
    .locator('.gallery__link img')
    .evaluateAll((els) =>
      els.map((e) => (e as HTMLImageElement).currentSrc || e.getAttribute('src')),
    );
  expect(thumbs.length).toBeGreaterThan(0);
  for (const url of thumbs) {
    const body = await (await request.get(new URL(url!, page.url()).href)).body();
    expect(body.includes(Buffer.from('EXIF', 'latin1')), url!).toBe(false);
    expect(body.includes(Buffer.from('Photoshop 3.0', 'latin1')), url!).toBe(false);
  }
});

test('Lightbox: Kamerafeld hat am Handy eine kleinere Schrift als am Computer', async ({
  page,
}) => {
  await page.goto(EXAMPLE);
  const info = page.locator('dialog[data-lightbox] [data-info]');
  const sizeAt = async (width: number) => {
    await page.setViewportSize({ width, height: 800 });
    await page.locator('.gallery__link').first().click();
    await expect(info).toBeVisible();
    const px = await info.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    await page.locator('dialog[data-lightbox] [data-close]').click();
    return px;
  };
  expect(await sizeAt(390)).toBeLessThan(12);
  expect(await sizeAt(1280)).toBeGreaterThan(14);
});

test('Lightbox: Kamera-Kasten (schwarz, weiße Schrift, unter dem Foto, nie breiter), fehlt ohne Angaben', async ({
  page,
  request,
}) => {
  await page.goto(EXAMPLE);
  const dialog = page.locator('dialog[data-lightbox]');
  const info = dialog.locator('[data-info]');
  await page.locator('.gallery__link').first().click();
  await expect(info).toBeVisible();
  // feste Reihenfolge, Mittelpunkt als Trenner, Kleinbild in Klammern
  await expect(info).toHaveText(
    'Apple iPhone 15 Pro · f/1,8 · 1/120 s · ISO 80 · 6,8 mm (24 mm KB)',
  );
  await expect(info).toHaveCSS('background-color', 'rgb(0, 0, 0)');
  await expect(info).toHaveCSS('color', 'rgb(255, 255, 255)');
  // eigener Kasten mit schmalem Rand (gleiche weiße Farbe wie der Fotorahmen), außerhalb des Fotorahmens, mit kleinem Abstand darunter,
  // zentriert und nicht breiter als das Foto
  await expect(info).toHaveCSS('border-top-width', '1px');
  await expect(info).toHaveCSS('border-top-color', 'rgb(255, 249, 239)');
  const [frame, box] = await Promise.all([
    dialog.locator('.lightbox__frame').boundingBox(),
    info.boundingBox(),
  ]);
  const gap = box!.y - (frame!.y + frame!.height);
  expect(gap).toBeGreaterThanOrEqual(8);
  expect(gap).toBeLessThanOrEqual(14);
  expect(box!.width).toBeLessThanOrEqual(frame!.width + 1);
  expect(Math.abs(box!.x + box!.width / 2 - (frame!.x + frame!.width / 2))).toBeLessThanOrEqual(2);
  // fehlende Angaben entfallen, die Reihenfolge bleibt
  await dialog.getByRole('button', { name: 'Nächstes Foto' }).click();
  await expect(info).toHaveText('Google Pixel 8 · f/1,7 · 1/500 s · ISO 50 · 6,9 mm');
  // Foto ohne Kameraangaben: kein leeres schwarzes Feld
  await dialog.getByRole('button', { name: 'Nächstes Foto' }).click();
  await expect(info).toBeHidden();
  // das große Bild trägt die Kameraangaben, aber weder Seriennummer noch Besitzer
  const large = await page.locator('.gallery__link').first().getAttribute('href');
  const body = await (await request.get(new URL(large!, page.url()).href)).body();
  expect(body.includes(Buffer.from('iPhone 15 Pro', 'latin1'))).toBe(true);
  for (const secret of ['Geheim', 'X1'])
    expect(body.includes(Buffer.from(secret, 'latin1')), secret).toBe(false);
  // Vorschaubilder bleiben ohne Metadaten
  const thumb = await page.locator('.gallery__link img').first().getAttribute('src');
  const thumbBody = await (await request.get(new URL(thumb!, page.url()).href)).body();
  expect(thumbBody.includes(Buffer.from('iPhone', 'latin1'))).toBe(false);
});

test('Lightbox: langer Kamera-Text bricht nur zwischen den Angaben um, Kasten nie breiter als das Foto', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(EXAMPLE);
  // zweites Foto (Hochformat) mit besonders langem Text
  await page.evaluate(() => {
    const link = document.querySelectorAll<HTMLElement>('.gallery__link')[1];
    link.dataset.info =
      'Samsung Galaxy S24 Ultra · f/1,7 · 1/1000 s · ISO 1250 · 6,3 mm (23 mm KB)';
  });
  await page.locator('.gallery__link').nth(1).click();
  const dialog = page.locator('dialog[data-lightbox]');
  const info = dialog.locator('[data-info]');
  await expect(info).toBeVisible();
  const [frame, box] = await Promise.all([
    dialog.locator('.lightbox__frame').boundingBox(),
    info.boundingBox(),
  ]);
  expect(box!.width).toBeLessThanOrEqual(frame!.width + 1);
  // der Text bricht um (mehr als eine Zeile), aber jede Angabe steht ganz in einer Zeile
  const lines = await info.evaluate((el) => {
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
    const parts = [...el.querySelectorAll<HTMLElement>('.lightbox__info-part')];
    return {
      total: Math.round(el.getBoundingClientRect().height / lineHeight),
      parts: parts.map((p) => Math.round(p.getBoundingClientRect().height / lineHeight)),
    };
  });
  expect(lines.total).toBeGreaterThan(1);
  expect(lines.parts).toHaveLength(5);
  expect(lines.parts.every((n) => n === 1)).toBe(true);
  // der Text selbst bleibt unverändert
  await expect(info).toHaveText(
    'Samsung Galaxy S24 Ultra · f/1,7 · 1/1000 s · ISO 1250 · 6,3 mm (23 mm KB)',
  );
});

test('Bildunterschrift: nicht in der Fotoliste, in der Großansicht bei langem Text scrollbar', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(EXAMPLE);
  // die Fotoliste zeigt keine Bildunterschriften
  await expect(page.locator('.gallery figcaption')).toHaveCount(0);
  const long = Array.from({ length: 200 }, (_, i) => `palabra${i}`).join(' ');
  await page.evaluate((t) => {
    document.querySelectorAll<HTMLElement>('.gallery__link')[0].dataset.caption = t;
  }, long);
  await page.locator('.gallery__link').first().click();
  const dialog = page.locator('dialog[data-lightbox]');
  const caption = dialog.locator('[data-caption]');
  await expect(caption).toBeVisible();
  const stage = (await dialog.locator('[data-stage]').boundingBox())!;
  const m = await caption.evaluate((el) => ({ client: el.clientHeight, scroll: el.scrollHeight }));
  expect(m.scroll).toBeGreaterThan(m.client); // scrollbar
  expect(m.client).toBeLessThanOrEqual(stage.height * 0.3 + 1); // höchstens 30 % der Bühne
  // Scroll-Hinweis: Verlauf unten am Anfang, oben und unten in der Mitte, nur oben am Ende
  const fade = () =>
    caption.evaluate((el) => ({
      top: el.style.getPropertyValue('--fade-top'),
      bottom: el.style.getPropertyValue('--fade-bottom'),
    }));
  expect(await fade()).toEqual({ top: '0px', bottom: '28px' });
  await caption.evaluate((el) => (el.scrollTop = (el.scrollHeight - el.clientHeight) / 2));
  await expect.poll(fade).toEqual({ top: '28px', bottom: '28px' });
  await caption.evaluate((el) => (el.scrollTop = el.scrollHeight));
  await expect.poll(fade).toEqual({ top: '28px', bottom: '0px' });
  await caption.evaluate((el) => (el.scrollTop = 0));
  // das Foto bleibt groß genug und die Kamera-Angaben bleiben sichtbar
  const frame = (await dialog.locator('.lightbox__frame').boundingBox())!;
  expect(frame.height).toBeGreaterThan(200);
  await expect(dialog.locator('[data-info]')).toBeVisible();
  // kurzer Text: kein Scrollen
  await dialog.getByRole('button', { name: 'Nächstes Foto' }).click();
  const short = await caption.evaluate((el) => ({
    client: el.clientHeight,
    scroll: el.scrollHeight,
  }));
  expect(short.scroll).toBeLessThanOrEqual(short.client + 1);
  expect(await fade()).toEqual({ top: '0px', bottom: '0px' }); // kurzer Text: kein Verlauf
});

test('Bildunterschrift: Text linksbündig', async ({ page }) => {
  await page.goto(EXAMPLE);
  await page.locator('.gallery__link').nth(2).click();
  const caption = page.locator('dialog[data-lightbox] [data-caption]');
  await expect(caption).toBeVisible();
  await expect(caption).toHaveCSS('text-align', 'left');
});

test('Bildunterschrift: Handy hochkant so breit wie das Foto, kleinere Schrift', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(EXAMPLE);
  await page.locator('.gallery__link').nth(2).click();
  const dialog = page.locator('dialog[data-lightbox]');
  const caption = dialog.locator('[data-caption]');
  await expect(caption).toBeVisible();
  const frame = (await dialog.locator('.lightbox__frame').boundingBox())!;
  const c = (await caption.boundingBox())!;
  expect(Math.abs(c.x - frame.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(c.width - frame.width)).toBeLessThanOrEqual(1);
  await expect(caption).toHaveCSS('font-size', '14.4px');
});

test('Lightbox: Vor-/Zurück-Pfeile stehen auf halber Höhe des Fotos, auch mit langer Bildunterschrift', async ({
  page,
}) => {
  await page.goto(EXAMPLE);
  const long = Array.from({ length: 200 }, (_, i) => `palabra${i}`).join(' ');
  await page.evaluate((t) => {
    document.querySelectorAll<HTMLElement>('.gallery__link')[1].dataset.caption = t;
  }, long);
  const dialog = page.locator('dialog[data-lightbox]');
  for (const size of [
    { width: 390, height: 844 },
    { width: 1280, height: 800 },
  ]) {
    await page.setViewportSize(size);
    await page.locator('.gallery__link').first().click();
    // Querformat (kurze Bildunterschrift), dann Hochformat (lange Bildunterschrift), dann ohne Kamera
    for (let i = 0; i < 3; i++) {
      await expect(dialog.locator('[data-count]')).toHaveText(`${i + 1} / 3`);
      await page.waitForTimeout(300);
      const frame = (await dialog.locator('.lightbox__frame').boundingBox())!;
      const prev = (await dialog.locator('[data-prev]').boundingBox())!;
      const next = (await dialog.locator('[data-next]').boundingBox())!;
      const mid = frame.y + frame.height / 2;
      expect(
        Math.abs(prev.y + prev.height / 2 - mid),
        `${size.width} Foto ${i + 1} zurück`,
      ).toBeLessThanOrEqual(2);
      expect(
        Math.abs(next.y + next.height / 2 - mid),
        `${size.width} Foto ${i + 1} weiter`,
      ).toBeLessThanOrEqual(2);
      if (i < 2) await dialog.locator('[data-next]').click();
    }
    await dialog.locator('[data-close]').click();
  }
});

test('Lightbox: Vor-/Zurück-Pfeile sind am Handy 32 px, am Computer 48 px (Schließen immer 48 px)', async ({
  page,
}) => {
  await page.goto(EXAMPLE);
  const dialog = page.locator('dialog[data-lightbox]');
  for (const { width, height, nav } of [
    { width: 390, height: 844, nav: 32 },
    { width: 1280, height: 800, nav: 48 },
  ]) {
    await page.setViewportSize({ width, height });
    await page.locator('.gallery__link').first().click();
    for (const sel of ['[data-prev]', '[data-next]']) {
      const box = (await dialog.locator(sel).boundingBox())!;
      expect(box.width, `${width} ${sel} Breite`).toBeCloseTo(nav, 0);
      expect(box.height, `${width} ${sel} Höhe`).toBeCloseTo(nav, 0);
    }
    const close = (await dialog.locator('[data-close]').boundingBox())!;
    expect(close.width).toBeCloseTo(48, 0);
    await dialog.locator('[data-close]').click();
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

  test('Vorschaukachel mit Laufzeit; Video erst nach dem Antippen, im Fenster, mit Ton', async ({
    page,
  }) => {
    // Nur echte Antworten zählen: Playwright-WebKit meldet für Videoelemente auch Scheinanfragen
    // (Status 0, ohne Header), die den Server nie erreichen.
    const mp4: string[] = [];
    page.on('response', (r) => {
      // Bewegtfotos (-motion.mp4) laden bei Sichtbarkeit von selbst; nur eigene Clips zählen.
      if (/\.mp4(\?|$)/.test(r.url()) && !/-motion\.mp4/.test(r.url()) && r.status() >= 200) {
        mp4.push(r.url());
      }
    });
    await page.goto(URL);
    await page.waitForLoadState('networkidle');
    const tile = page.locator('a[data-clip-item]');
    await expect(tile).toHaveCount(1);
    await expect(tile).toHaveAttribute('href', /\.mp4$/);
    await expect(tile).toHaveAttribute('aria-label', /Testclip.*abspielen, Dauer 0:02/);
    await expect(tile.locator('img')).toHaveAttribute('src', /-poster\.jpg$/);
    await expect(tile.locator('.clip__time')).toHaveText('0:02');
    const dialog = page.locator('[data-clip-dialog]');
    const video = dialog.locator('video');
    await expect(dialog).toBeHidden();
    await expect(video).toHaveAttribute('preload', 'none');
    await expect(video).toHaveAttribute('controls', '');
    expect(await video.evaluate((v: HTMLVideoElement) => v.muted)).toBe(false);
    expect(await video.evaluate((v: HTMLVideoElement) => v.autoplay)).toBe(false);
    // Vor dem Antippen wird die Videodatei nicht geladen.
    expect(mp4).toEqual([]);
    // Nach dem Antippen öffnet sich das Fenster und die Datei wird angefragt
    // (Chromium ohne H.264 kann sie nicht dekodieren, die Anfrage genügt).
    await tile.click();
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('[data-clip-title]')).toHaveText(/Testclip/);
    await expect(video).toHaveAttribute('aria-label', /Testclip/);
    await expect(video).toHaveAttribute('src', /\.mp4$/);
    await expect.poll(() => mp4.length).toBeGreaterThan(0);
    // Schließen gibt die Datei frei und der Fokus kehrt zur Kachel zurück
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(video).not.toHaveAttribute('src', /.*/);
    await expect(tile).toBeFocused();
    // Knopf „Schließen“ funktioniert ebenfalls
    await tile.click();
    await dialog.getByRole('button', { name: 'Schließen' }).click();
    await expect(dialog).toBeHidden();
  });

  test('Videodatei hat keinen Standort und wird in Teilen abrufbar geliefert', async ({
    page,
    request,
  }) => {
    await page.goto(URL);
    const src = await page.locator('a[data-clip-item]').getAttribute('href');
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
    test('Kachel verlinkt direkt auf das Video, nichts ist gekürzt', async ({ page }) => {
      await page.goto(URL);
      await expect(page.locator('a[data-clip-item][href$=".mp4"]')).toHaveCount(1);
      await page.goto(TWENTY);
      await expect(page.locator('.gallery__grid > li:visible')).toHaveCount(20);
      await expect(page.locator('.videos__grid > li:visible')).toHaveCount(10);
      await expect(page.locator('[data-more-btn]:visible')).toHaveCount(0);
    });
  });
});

test.describe('Videokacheln so groß wie Fotokacheln', () => {
  for (const size of [
    { width: 1280, height: 900 },
    { width: 800, height: 900 },
    { width: 390, height: 844 },
  ]) {
    test(`${size.width}px: gleiche Breite und Höhe`, async ({ page }) => {
      await page.setViewportSize(size);
      await page.goto(TWENTY);
      const photo = (await page.locator('.gallery__link').first().boundingBox())!;
      const clip = (await page.locator('a[data-clip-item]').first().boundingBox())!;
      expect(Math.abs(photo.width - clip.width)).toBeLessThan(1.5);
      expect(Math.abs(photo.height - clip.height)).toBeLessThan(1.5);
    });
  }
});

test.describe('Mehr anzeigen bei Fotos und Videos', () => {
  const grids = [
    { name: 'Fotos', grid: '.gallery__grid', total: 20, btn: /Mehr anzeigen \(Fotos\)/ },
    { name: 'Videos', grid: '.videos__grid', total: 10, btn: /Mehr anzeigen \(Videos\)/ },
  ];
  // Computer 4 Spalten → 8, mittlere Breite 3 Spalten → 6, Handy 2 Spalten → 4 (immer 2 Reihen)
  const sizes = [
    { width: 1280, height: 900, shown: 8 },
    { width: 800, height: 900, shown: 6 },
    { width: 390, height: 844, shown: 4 },
  ];
  for (const g of grids) {
    for (const size of sizes) {
      test(`${g.name} ${size.width}px: zunächst ${size.shown} sichtbar, Knopf zeigt alle`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: size.width, height: size.height });
        await page.goto(TWENTY);
        const items = page.locator(`${g.grid} > li:visible`);
        const btn = page.getByRole('button', { name: g.btn });
        await expect(items).toHaveCount(size.shown);
        await expect(btn).toHaveAttribute('aria-expanded', 'false');
        await btn.click();
        await expect(items).toHaveCount(g.total);
        const less = page.getByRole('button', { name: /Weniger anzeigen/ }).filter({
          hasText: g.name,
        });
        await expect(less).toHaveAttribute('aria-expanded', 'true');
        await less.click();
        await expect(items).toHaveCount(size.shown);
      });
    }
  }

  test('Fotos und Videos klappen unabhängig voneinander auf', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(TWENTY);
    await page.getByRole('button', { name: /Mehr anzeigen \(Fotos\)/ }).click();
    await expect(page.locator('.gallery__grid > li:visible')).toHaveCount(20);
    await expect(page.locator('.videos__grid > li:visible')).toHaveCount(8);
  });

  test('Kein Knopf, wenn nichts verborgen wäre', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(PREVIEW_URL + 'entradas/2026-12-03-gps-y-heic/'); // 3 Fotos, 1 Video
    await expect(page.locator('[data-more-btn]:visible')).toHaveCount(0);
  });

  test('Die Lightbox blättert auch zu verborgenen Fotos', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(TWENTY);
    await page.locator('.gallery__link').first().click();
    await expect(page.locator('[data-count]')).toHaveText('1 / 20');
    await page.keyboard.press('ArrowLeft'); // zurück = letztes (verborgenes) Foto
    await expect(page.locator('[data-count]')).toHaveText('20 / 20');
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

test('Lightbox: Handy quer – Foto nutzt fast die ganze Höhe, Bildunterschrift steht daneben, kein Schrumpfen', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(EXAMPLE);
  await page.evaluate(() => {
    // langer Kamera-Text bei allen Fotos (der Fall, der das Hochformat-Foto früher auf ~120 px schrumpfen ließ)
    document.querySelectorAll<HTMLElement>('.gallery__link').forEach((l) => {
      l.dataset.info = 'Samsung Galaxy S24 Ultra · f/1,7 · 1/1000 s · ISO 1250 · 6,3 mm (23 mm KB)';
    });
  });
  const dialog = page.locator('dialog[data-lightbox]');
  const frame = dialog.locator('.lightbox__frame');
  const info = dialog.locator('[data-info]');
  await page.locator('.gallery__link').nth(1).click(); // Hochformat-Foto
  await expect(dialog.locator('[data-count]')).toHaveText('2 / 3');
  await page.waitForTimeout(300);
  const portraitUpright = (await frame.boundingBox())!;

  // Handy drehen, während die Großansicht offen ist
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(300);
  const f = (await frame.boundingBox())!;
  const i = (await info.boundingBox())!;
  // Foto füllt fast die Höhe (Bildschirm 390 px) und ist nicht auf wenige Pixel geschrumpft
  expect(f.height).toBeGreaterThanOrEqual(300);
  expect(f.width).toBeGreaterThanOrEqual(220);
  // Kasten bricht nicht in Buchstabenhäppchen (alle Angaben jeweils in einer Zeile, höchstens 3 Zeilen)
  const lines = await info.evaluate((el) => {
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
    return {
      total: Math.round(el.getBoundingClientRect().height / lineHeight),
      parts: [...el.querySelectorAll<HTMLElement>('.lightbox__info-part')].map((p) =>
        Math.round(p.getBoundingClientRect().height / lineHeight),
      ),
    };
  });
  expect(lines.total).toBeLessThanOrEqual(3);
  expect(lines.parts.every((n) => n === 1)).toBe(true);
  expect(i.width).toBeLessThanOrEqual(f.width + 1);
  // alles bleibt im Bildschirm
  expect(f.y).toBeGreaterThanOrEqual(0);
  expect(i.y + i.height).toBeLessThanOrEqual(390);
  // Zähler und Schließen-Knopf schweben über dem Foto statt eine eigene Zeile zu belegen
  expect(f.y).toBeLessThanOrEqual(12);
  expect(portraitUpright.width).toBeGreaterThan(f.width); // hochkant ist das Hochformat-Foto breiter (Breite begrenzt)

  // Querformat-Foto mit Bildunterschrift: Unterschrift rechts neben dem Foto, nicht darunter
  await dialog.locator('[data-next]').click();
  await expect(dialog.locator('[data-count]')).toHaveText('3 / 3');
  await page.waitForTimeout(300);
  const wide = (await frame.boundingBox())!;
  const caption = (await dialog.locator('[data-caption]').boundingBox())!;
  expect(wide.height).toBeGreaterThanOrEqual(300);
  expect(caption.x).toBeGreaterThanOrEqual(wide.x + wide.width);
  // größer als hochkant (dort ist das Querformat-Foto durch die Breite begrenzt)
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  const wideUpright = (await frame.boundingBox())!;
  expect(wide.width).toBeGreaterThan(wideUpright.width * 1.15);
  // wieder hochkant: Bildunterschrift steht darunter
  const captionUpright = (await dialog.locator('[data-caption]').boundingBox())!;
  expect(captionUpright.y).toBeGreaterThanOrEqual(wideUpright.y + wideUpright.height);
});

/** Vollbild-API und Zeigergerät nachgebildet: unabhängig vom Browser (WebKit kennt sie am iPhone nicht). */
async function fakeFullscreen(
  page: import('@playwright/test').Page,
  { coarse, supported = true }: { coarse: boolean; supported?: boolean },
) {
  await page.addInitScript(
    ({ coarse, supported }) => {
      const w = window as unknown as { __fs: { el: Element | null; calls: number } };
      w.__fs = { el: null, calls: 0 };
      Object.defineProperty(document, 'fullscreenEnabled', {
        value: supported,
        configurable: true,
      });
      Object.defineProperty(document, 'fullscreenElement', {
        get: () => w.__fs.el,
        configurable: true,
      });
      if (supported) {
        Element.prototype.requestFullscreen = function () {
          w.__fs.el = this;
          w.__fs.calls++;
          document.dispatchEvent(new Event('fullscreenchange'));
          return Promise.resolve();
        };
        document.exitFullscreen = () => {
          w.__fs.el = null;
          document.dispatchEvent(new Event('fullscreenchange'));
          return Promise.resolve();
        };
      }
      const real = window.matchMedia.bind(window);
      window.matchMedia = (q: string) =>
        q.includes('pointer: coarse')
          ? ({
              matches: coarse,
              media: q,
              addEventListener() {},
              removeEventListener() {},
            } as never)
          : real(q);
    },
    { coarse, supported },
  );
}
const fsState = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const w = window as unknown as { __fs: { el: Element | null; calls: number } };
    return { active: w.__fs.el != null, calls: w.__fs.calls };
  });

test.describe('Vollbild (nachgebildete API)', () => {
  // WebKit mit iPhone- oder iPad-Emulation hat die Vollbild-API für Elemente nicht (wie ein echtes iPhone)
  // und entfernt auch die nachgebildete wieder; dort gilt nur der Test „ohne Vollbild-Unterstützung“ unten.
  test.use({ autoFullscreen: true });
  test.beforeEach(({}, testInfo) => {
    test.skip(
      ['mobile-safari', 'ipad'].includes(testInfo.project.name),
      'iPhone-/iPad-WebKit: keine Vollbild-API',
    );
  });

  test('Lightbox: am Touchgerät startet das Vollbild automatisch und endet mit dem Schließen', async ({
    page,
  }) => {
    await fakeFullscreen(page, { coarse: true });
    await page.goto(EXAMPLE);
    const dialog = page.locator('dialog[data-lightbox]');
    const button = dialog.locator('[data-fullscreen]');
    await page.locator('.gallery__link').first().click();
    expect(await fsState(page)).toEqual({ active: true, calls: 1 });
    await expect(button).toBeVisible();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    // Blättern startet es nicht erneut
    await dialog.locator('[data-next]').click();
    expect((await fsState(page)).calls).toBe(1);
    await dialog.locator('[data-close]').click();
    await expect.poll(async () => (await fsState(page)).active).toBe(false);
    // nächstes Öffnen: wieder Vollbild
    await page.locator('.gallery__link').first().click();
    expect(await fsState(page)).toEqual({ active: true, calls: 2 });
  });

  test('Lightbox: Vollbild per Knopf beenden gilt für die Sitzung, per Knopf wieder einschalten', async ({
    page,
  }) => {
    await fakeFullscreen(page, { coarse: true });
    await page.goto(EXAMPLE);
    const dialog = page.locator('dialog[data-lightbox]');
    const button = dialog.locator('[data-fullscreen]');
    await page.locator('.gallery__link').first().click();
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    expect((await fsState(page)).active).toBe(false);
    await dialog.locator('[data-close]').click();
    // Wahl bleibt: kein Vollbild beim nächsten Öffnen
    await page.locator('.gallery__link').first().click();
    expect((await fsState(page)).active).toBe(false);
    // und auch nach dem Neuladen derselben Sitzung
    await page.reload();
    await page.locator('.gallery__link').first().click();
    expect((await fsState(page)).active).toBe(false);
    // wieder einschalten: gilt ab jetzt wieder automatisch
    await button.click();
    expect((await fsState(page)).active).toBe(true);
    await dialog.locator('[data-close]').click();
    await page.locator('.gallery__link').first().click();
    expect((await fsState(page)).active).toBe(true);
  });

  test('Lightbox: Vollbild vom Browser beendet (Wischgeste) wird gemerkt, Großansicht bleibt offen', async ({
    page,
  }) => {
    await fakeFullscreen(page, { coarse: true });
    await page.goto(EXAMPLE);
    const dialog = page.locator('dialog[data-lightbox]');
    await page.locator('.gallery__link').first().click();
    expect((await fsState(page)).active).toBe(true);
    await page.evaluate(() => document.exitFullscreen());
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('[data-fullscreen]')).toHaveAttribute('aria-pressed', 'false');
    await dialog.locator('[data-close]').click();
    await page.locator('.gallery__link').first().click();
    expect((await fsState(page)).active).toBe(false);
  });

  test('Lightbox: am Computer kein automatisches Vollbild, aber der Knopf geht', async ({
    page,
  }) => {
    await fakeFullscreen(page, { coarse: false });
    await page.goto(EXAMPLE);
    const dialog = page.locator('dialog[data-lightbox]');
    await page.locator('.gallery__link').first().click();
    expect((await fsState(page)).active).toBe(false);
    await dialog.locator('[data-fullscreen]').click();
    expect((await fsState(page)).active).toBe(true);
  });
});

test('Lightbox: ohne Vollbild-Unterstützung (z. B. iPhone) gibt es den Knopf nicht', async ({
  page,
}) => {
  await fakeFullscreen(page, { coarse: true, supported: false });
  await page.goto(EXAMPLE);
  await page.locator('.gallery__link').first().click();
  await expect(page.locator('dialog[data-lightbox]')).toBeVisible();
  await expect(page.locator('dialog[data-lightbox] [data-fullscreen]')).toBeHidden();
});
