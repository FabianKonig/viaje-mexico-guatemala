import { defineConfig, devices } from '@playwright/test';

/**
 * Die Seite wird vorher gebaut (npm run build:e2e) und hier nur ausgeliefert:
 *  - dist/          unter http://127.0.0.1:4321/                 (echte Inhalte, Hauptseite)
 *  - dist-preview/  unter http://127.0.0.1:4322/pr-preview/pr-1/ (Testinhalte, Vorschau-Modus)
 * Browser-Projekte: siehe SPEC.md, Abschnitt "Browser-Unterstützung".
 */
const exe = process.env.PW_CHROMIUM_PATH
  ? { launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH } }
  : {};

export const ROOT_URL = 'http://127.0.0.1:4321/';
export const PREVIEW_URL = 'http://127.0.0.1:4322/pr-preview/pr-1/';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: ROOT_URL,
    trace: 'off',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'node scripts/serve.mjs dist 4321',
      url: ROOT_URL,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'node scripts/serve.mjs dist-preview 4322 /pr-preview/pr-1/',
      url: PREVIEW_URL,
      reuseExistingServer: !process.env.CI,
    },
  ],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], ...exe } }],
});
