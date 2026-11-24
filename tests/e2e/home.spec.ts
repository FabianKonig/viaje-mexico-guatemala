import { test, expect, expectNoProblems } from './fixtures';

test.describe('Startseite', () => {
  test('zeigt Titel, Profilbild, Karte, Beiträge und Palabrita', async ({ page, problems }) => {
    await page.goto('./');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Un viaje a México y Guatemala' }),
    ).toBeVisible();
    await expect(page.locator('.avatar')).toBeVisible();
    await expect(page.locator('#ruta')).toBeVisible();
    await expect(page.getByText('¡Bienvenido / Willkommen!', { exact: true })).toBeVisible();
    await expect(page.getByText('Mein Versuch eines Reiseblogs.')).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Entradas' })).toBeVisible();
    await expect(page.locator('.post-card').first()).toBeVisible();
    await page.waitForLoadState('networkidle');
    expectNoProblems(problems);
  });

  test('Knopf „Neuesten Beitrag lesen“ führt zum neuesten Beitrag', async ({ page }) => {
    await page.goto('./');
    const btn = page.getByRole('link', { name: 'Neuesten Beitrag lesen' });
    const first = page.locator('.post-card h3 a').first();
    await expect(btn).toHaveAttribute('href', (await first.getAttribute('href'))!);
  });

  test('Palabrita-Kachel verlinkt richtig und steht ganz unten vor dem Fußbereich', async ({
    page,
  }) => {
    await page.goto('./');
    const tile = page.locator('a.palabrita');
    await expect(tile).toHaveAttribute('href', 'https://palabrita.fabiankonig.de');
    await expect(tile).toHaveAttribute('target', '_blank');
    await expect(tile).toHaveAttribute('rel', /noopener/);
    await expect(tile).toContainText('Kennst du schon meine Vokabellern-App?');
    await expect(tile).toContainText("Hier geht's zu Palabrita.");
    await expect(tile).toContainText('Palabrita öffnen →');
    const isLastBeforeFooter = await page.evaluate(() => {
      const main = document.querySelector('main')!;
      return main.lastElementChild?.contains(document.querySelector('a.palabrita')) ?? false;
    });
    expect(isLastBeforeFooter).toBe(true);
  });

  test('Fußbereich mit WhatsApp-Hinweis und Copyright, ohne „Über das Projekt“', async ({
    page,
  }) => {
    await page.goto('./');
    const footer = page.locator('footer');
    await expect(footer).toContainText(
      'Gefällt dir ein Beitrag? Reagiere in der WhatsApp-Gruppe. Dort verlinke ich jeden neuen Eintrag.',
    );
    await expect(footer).toContainText(/© 2026–2027 .+\. Alle Rechte vorbehalten\./);
    await expect(page.getByText('Über das Projekt')).toHaveCount(0);
  });

  test('gelber Kasten beginnt am Computer oben bündig mit der Karte', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('./');
    const badge = await page.locator('.hero__badge').boundingBox();
    const map = await page.locator('#ruta').boundingBox();
    expect(Math.abs(badge!.y - map!.y)).toBeLessThanOrEqual(1);
    expect(badge!.x).toBeLessThan(map!.x);
  });

  test('am Computer umfließt der Text die Karte, Zeilen darunter nutzen die volle Breite', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('./');
    const map = await page.locator('#ruta').boundingBox();
    const lines = await page.locator('.hero__lead').evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      return [...range.getClientRects()]
        .filter((r) => r.width > 0)
        .map((r) => ({ top: r.top, bottom: r.bottom, right: r.right }));
    });
    const mapBottom = map!.y + map!.height;
    const beside = lines.filter((l) => l.bottom <= mapBottom);
    const below = lines.filter((l) => l.top >= mapBottom);
    expect(beside.length).toBeGreaterThan(0);
    expect(below.length).toBeGreaterThan(0);
    // Neben der Karte bleiben die Zeilen links davon, darunter reichen sie unter die Karte.
    for (const l of beside) expect(l.right).toBeLessThanOrEqual(map!.x);
    expect(Math.max(...below.map((l) => l.right))).toBeGreaterThan(map!.x);
  });

  test('am Handy steht alles untereinander', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('./');
    const actions = await page.locator('.hero__actions').boundingBox();
    const map = await page.locator('#ruta').boundingBox();
    expect(map!.y).toBeGreaterThan(actions!.y + actions!.height - 1);
  });
});
