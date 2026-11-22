import { test as base, expect, type Page } from '@playwright/test';

export const ROOT_URL = 'http://127.0.0.1:4321/';
export const PREVIEW_URL = 'http://127.0.0.1:4322/pr-preview/pr-1/';
const LOCAL_HOSTS = new Set(['127.0.0.1:4321', '127.0.0.1:4322']);

export interface PageProblems {
  consoleErrors: string[];
  failedRequests: string[];
  externalRequests: string[];
}

/** Sammelt Konsolenfehler, fehlgeschlagene und externe Anfragen einer Seite. */
export function watchPage(page: Page): PageProblems {
  const problems: PageProblems = { consoleErrors: [], failedRequests: [], externalRequests: [] };
  page.on('console', (msg) => {
    if (msg.type() === 'error') problems.consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => problems.consoleErrors.push(String(err)));
  page.on('request', (req) => {
    const url = new URL(req.url());
    if (url.protocol === 'data:' || url.protocol === 'blob:') return;
    if (!LOCAL_HOSTS.has(url.host)) problems.externalRequests.push(req.url());
  });
  page.on('requestfailed', (req) =>
    problems.failedRequests.push(`${req.url()} (${req.failure()?.errorText})`),
  );
  page.on('response', (res) => {
    // 404-Seite selbst ist erwartet, wenn wir sie bewusst aufrufen
    if (res.status() >= 400 && !res.url().includes('gibt-es-nicht'))
      problems.failedRequests.push(`${res.url()} → ${res.status()}`);
  });
  return problems;
}

export const test = base.extend<{ problems: PageProblems }>({
  problems: async ({ page }, use) => {
    const problems = watchPage(page);
    await use(problems);
  },
});

export function expectNoProblems(p: PageProblems) {
  expect(p.consoleErrors, 'Konsolenfehler').toEqual([]);
  expect(p.failedRequests, 'fehlgeschlagene Anfragen').toEqual([]);
  expect(p.externalRequests, 'Anfragen an Drittanbieter').toEqual([]);
}

export { expect };
