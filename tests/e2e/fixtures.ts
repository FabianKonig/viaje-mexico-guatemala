import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { test as base, expect, type Page } from '@playwright/test';

export const ROOT_URL = 'http://127.0.0.1:4321/';
export const PREVIEW_URL = 'http://127.0.0.1:4322/pr-preview/pr-1/';
const LOCAL_HOSTS = new Set(['127.0.0.1:4321', '127.0.0.1:4322']);

/**
 * Neuester echter Beitrag aus content/posts (die Tests dürfen sich nicht auf einen bestimmten
 * echten Beitrag festlegen, denn Beiträge kommen und gehen). Testbeiträge liegen in tests/fixtures.
 */
export function latestRealPost() {
  const dir = path.join('content', 'posts');
  const slug = fs.readdirSync(dir).sort().at(-1)!;
  const index = fs.readFileSync(path.join(dir, slug, 'index.md'), 'utf8');
  const fm = YAML.parse(index.split(/^---$/m)[1]);
  return { slug, url: `./entradas/${slug}/`, title: fm.title as string };
}

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
  page.on('requestfailed', (req) => {
    const error = req.failure()?.errorText ?? '';
    // Verlässt der Test die Seite, während ein Bild noch lädt, bricht der Browser die Anfrage
    // selbst ab (WebKit: „Load request cancelled“). Das ist kein Fehler der Seite.
    if (req.resourceType() === 'image' && /cancel|aborted/i.test(error)) return;
    problems.failedRequests.push(`${req.url()} (${error})`);
  });
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
