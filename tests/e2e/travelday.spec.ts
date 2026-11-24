import { test, expect } from './fixtures';

const CASES: [string, string][] = [
  ['2026-11-22T12:00:00-06:00', "Los geht's am 23. November 2026"],
  ['2026-11-23T00:30:00-06:00', 'Heute ist der 1. Tag der Reise'],
  ['2027-02-02T23:00:00-06:00', 'Heute ist der 72. Tag der Reise'],
  ['2027-02-03T08:00:00-06:00', 'Reise nach 72 Tagen beendet'],
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
  await expect(page.locator('[data-travel-day]')).toHaveText('Heute ist der 32. Tag der Reise');
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
