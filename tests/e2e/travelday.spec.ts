import { test, expect } from './fixtures';

const CASES: [string, string][] = [
  ['2026-11-22T12:00:00-06:00', "Los geht's am 23. November 2026"],
  ['2026-11-23T00:30:00-06:00', 'Tag 1 unterwegs'],
  ['2027-02-02T23:00:00-06:00', 'Tag 72 unterwegs'],
  ['2027-02-03T08:00:00-06:00', 'Reise beendet · wieder zurück in Alemania'],
];

for (const [time, expected] of CASES) {
  test(`Reisetag live im Browser: ${time} → ${expected}`, async ({ page }) => {
    await page.clock.setFixedTime(new Date(time));
    await page.goto('./');
    await expect(page.locator('[data-travel-day]')).toHaveText(expected);
  });
}

test('Vorschau-Datum per ?datum=', async ({ page }) => {
  await page.goto('./?datum=2026-12-24');
  await expect(page.locator('[data-travel-day]')).toHaveText('Tag 32 unterwegs');
});

test.describe('ohne JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('zeigt den Reisezeitraum', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('[data-travel-day]')).toHaveText(
      'Reise vom 23. November 2026 bis 2. Februar 2027',
    );
  });
});
