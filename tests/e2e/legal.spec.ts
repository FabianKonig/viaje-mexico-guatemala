import { test, expect, expectNoProblems, watchPage, PREVIEW_URL, ROOT_URL } from './fixtures';
import type { Page } from '@playwright/test';

/** Sammelt alle internen Seiten ab der Startseite (Breitensuche). */
async function crawl(page: Page, start: string): Promise<string[]> {
  const seen = new Set<string>([start]);
  const queue = [start];
  while (queue.length) {
    const url = queue.shift()!;
    await page.goto(url);
    const links = await page
      .locator('a[href]')
      .evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).href));
    for (const l of links) {
      const u = new URL(l);
      u.hash = '';
      const s = u.toString();
      if (s.startsWith(start) && !/\.(webp|jpg|png|txt|svg)$/.test(u.pathname) && !seen.has(s)) {
        seen.add(s);
        queue.push(s);
      }
    }
  }
  return [...seen];
}

for (const start of [ROOT_URL, PREVIEW_URL]) {
  test(`alle Seiten (${start}): noindex, Copyright, Fußbereich-Links, Open Graph, keine Drittanbieter`, async ({
    page,
    context,
  }) => {
    const pages = await crawl(page, start);
    expect(pages.length).toBeGreaterThanOrEqual(5);
    for (const url of pages) {
      const p = await context.newPage();
      const problems = watchPage(p);
      await p.goto(url);
      await p.waitForLoadState('networkidle');
      await expect(p.locator('meta[name="robots"]'), url).toHaveAttribute(
        'content',
        'noindex, nofollow, noimageindex',
      );
      await expect(p.locator('meta[name="copyright"]'), url).toHaveAttribute(
        'content',
        /^© 2026–2027 .+\. Alle Rechte vorbehalten\.$/,
      );
      await expect(p.locator('footer .copyright'), url).toHaveText(
        /^© 2026–2027 .+\. Alle Rechte vorbehalten\.$/,
      );
      const footer = p.locator('footer');
      for (const name of ['Impressum', 'Datenschutz', 'Lizenzhinweise'])
        await expect(footer.getByRole('link', { name }), url).toBeVisible();
      for (const prop of ['og:title', 'og:description', 'og:url', 'og:image']) {
        await expect(p.locator(`meta[property="${prop}"]`), `${url} ${prop}`).toHaveAttribute(
          'content',
          /.+/,
        );
      }
      const og = await p.locator('meta[property="og:image"]').getAttribute('content');
      expect(og, url).toMatch(/^https:\/\/viaje\.fabiankonig\.de\//);
      // og:image existiert im Build (absolute Adresse auf den lokalen Server abbilden)
      const local = og!.replace('https://viaje.fabiankonig.de/', new URL(start).origin + '/');
      expect((await p.request.get(local)).ok(), local).toBe(true);
      expectNoProblems(problems);
      await p.close();
    }
    expect(await context.cookies()).toEqual([]);
  });
}

test('Beitrag mit Fotos nutzt das erste Foto als Vorschaubild (JPEG 1200×630)', async ({
  page,
}) => {
  await page.goto(PREVIEW_URL + 'entradas/2026-11-23-entrada-de-ejemplo/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    /\/media\/2026-11-23-entrada-de-ejemplo\/.+-og\.jpg$/,
  );
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article');
  await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute('content', '1200');
});

test('robots.txt sperrt alles', async ({ request }) => {
  for (const base of [ROOT_URL]) {
    const txt = await (await request.get(base + 'robots.txt')).text();
    expect(txt).toMatch(/User-agent: \*\s+Disallow: \/\s*$/);
  }
});

test('Schrift-Lizenzen werden ausgeliefert', async ({ request }) => {
  for (const f of ['OFL-Fraunces.txt', 'OFL-DM-Sans.txt']) {
    const res = await request.get(ROOT_URL + 'fonts/' + f);
    expect(res.ok()).toBe(true);
    expect(await res.text()).toContain('SIL OPEN FONT LICENSE Version 1.1');
  }
});

test('Impressum, Datenschutz und Lizenzhinweise sind erreichbar und vollständig', async ({
  page,
  problems,
}) => {
  await page.goto('./');
  await page.locator('footer').getByRole('link', { name: 'Impressum' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Impressum' })).toBeVisible();
  await expect(page.locator('main')).toContainText('§ 5 DDG');
  await page.locator('footer').getByRole('link', { name: 'Datenschutz' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Datenschutzerklärung' })).toBeVisible();
  for (const t of [
    'GitHub',
    'IP-Adresse',
    'keine Cookies',
    'youtube-nocookie.com',
    'Palabrita',
    'Fraunces',
  ]) {
    await expect(page.locator('main')).toContainText(t);
  }
  await page.locator('footer').getByRole('link', { name: 'Lizenzhinweise' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Lizenzhinweise' })).toBeVisible();
  await expect(page.locator('main')).toContainText('SIL Open Font License');
  await expect(page.locator('main')).toContainText('Alle Rechte vorbehalten');
  expectNoProblems(problems);
});
