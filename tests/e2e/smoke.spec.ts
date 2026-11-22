import { test, expect, expectNoProblems, PREVIEW_URL } from './fixtures';

test('Startseite lädt ohne Fehler und ohne Drittanbieter', async ({ page, problems }) => {
  await page.goto('./');
  await expect(page).toHaveTitle(/Un viaje a México y Guatemala/);
  await page.waitForLoadState('networkidle');
  expectNoProblems(problems);
});

test('404-Seite ist vorhanden', async ({ page }) => {
  const res = await page.goto('./gibt-es-nicht/');
  expect(res?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('Seite funktioniert unter einem Unterpfad (/pr-preview/pr-1/)', async ({ page, problems }) => {
  await page.goto(PREVIEW_URL);
  await expect(page).toHaveTitle(/Un viaje a México y Guatemala/);
  await page.waitForLoadState('networkidle');
  expectNoProblems(problems);
});

test('keine Cookies', async ({ page, context }) => {
  await page.goto('./');
  await page.waitForLoadState('networkidle');
  expect(await context.cookies()).toEqual([]);
});
