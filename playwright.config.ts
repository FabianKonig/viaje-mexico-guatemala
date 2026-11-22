import { defineConfig, devices } from '@playwright/test';

/**
 * Die Seite wird vorher gebaut (npm run build:e2e) und hier nur ausgeliefert:
 *  - dist/          unter http://127.0.0.1:4321/                 (echte Inhalte, Hauptseite)
 *  - dist-preview/  unter http://127.0.0.1:4322/pr-preview/pr-1/ (Testinhalte, Vorschau-Modus)
 *
 * Browser-Projekte (siehe SPEC.md › Browser-Unterstützung):
 *  PW_PROJECTS=pr       (Standard) chromium, firefox, webkit, mobile-chrome (Pixel 7), mobile-safari (iPhone 15)
 *  PW_PROJECTS=nightly  zusätzlich echte Kanäle msedge und chrome, iPad, Galaxy (Android, Chromium)
 *  PW_PROJECTS=local    nur chromium (schnell, lokal)
 * Lokal mit vorinstalliertem Chromium: PW_CHROMIUM_PATH=/opt/pw-browsers/chromium
 */
const exe = process.env.PW_CHROMIUM_PATH
  ? { launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH } }
  : {};

const PR = [
  { name: 'chromium', use: { ...devices['Desktop Chrome'], ...exe } },
  { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  { name: 'mobile-chrome', use: { ...devices['Pixel 7'], ...exe } },
  { name: 'mobile-safari', use: { ...devices['iPhone 15'] } },
];
const NIGHTLY = [
  { name: 'msedge', use: { ...devices['Desktop Edge'], channel: 'msedge' } },
  { name: 'chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
  { name: 'ipad', use: { ...devices['iPad (gen 7)'] } },
  { name: 'galaxy', use: { ...devices['Galaxy S9+'], ...exe } },
];

const mode = process.env.PW_PROJECTS ?? 'pr';
const projects = mode === 'local' ? PR.slice(0, 1) : mode === 'nightly' ? [...PR, ...NIGHTLY] : PR;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4321/',
    trace: 'off',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'node scripts/serve.mjs dist 4321',
      url: 'http://127.0.0.1:4321/',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'node scripts/serve.mjs dist-preview 4322 /pr-preview/pr-1/',
      url: 'http://127.0.0.1:4322/pr-preview/pr-1/',
      reuseExistingServer: !process.env.CI,
    },
  ],
  projects,
});
