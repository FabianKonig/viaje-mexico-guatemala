import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { test, expect, expectNoProblems, PREVIEW_URL, ROOT_URL } from './fixtures';

interface Seg {
  lang: 'es' | 'de';
  text: string;
  de?: string;
}

function postsIn(contentDir: string, baseUrl: string) {
  const dir = path.join(contentDir, 'posts');
  return fs.readdirSync(dir).map((slug) => {
    const index = fs.readFileSync(path.join(dir, slug, 'index.md'), 'utf8');
    const fm = YAML.parse(index.split(/^---$/m)[1]);
    return {
      slug,
      url: `${baseUrl}entradas/${slug}/`,
      original: fs.readFileSync(path.join(dir, slug, 'original.md'), 'utf8'),
      segments: fm.translation.segments as Seg[],
      title: fm.title as string,
    };
  });
}

const ALL = [...postsIn('content', ROOT_URL), ...postsIn('tests/fixtures/content', PREVIEW_URL)];

for (const post of ALL) {
  test(`Originaltreue: ${post.slug}`, async ({ page }) => {
    await page.goto(post.url);
    // Kachel „Original“ ist byte-gleich zur Quelldatei
    const shown = await page.locator('[data-original]').evaluate((el) => el.textContent);
    // Der Browser normalisiert beim Einlesen des HTML Zeilenenden (CRLF → LF).
    expect(shown).toBe(post.original.replace(/\r\n?/g, '\n'));
    // Etikett
    await expect(page.getByText('Mi español, sin corregir')).toBeVisible();

    const hasSpanish = post.segments.some((s) => s.lang === 'es');
    const translation = page.locator('[data-translation]');
    if (!hasSpanish) {
      await expect(translation).toHaveCount(0);
      await expect(page.getByRole('button', { name: /Übersetzung/ })).toHaveCount(0);
      return;
    }
    // deutsche Passagen stehen unverändert in der Übersetzung, spanische sind übersetzt
    const kept = await translation.locator('[data-lang="de"]').allTextContents();
    const translated = await translation.locator('[data-lang="es"]').allTextContents();
    expect(kept).toEqual(post.segments.filter((s) => s.lang === 'de').map((s) => s.text));
    expect(translated).toEqual(post.segments.filter((s) => s.lang === 'es').map((s) => s.de));
    // spanischer Originaltext taucht nicht in der Übersetzung auf
    const translationText = (await translation.textContent()) ?? '';
    for (const s of post.segments.filter((s) => s.lang === 'es'))
      expect(translationText).not.toContain(s.text);
  });
}

test('Beitragsseite: Titel, Ort und Tag, Zurück-Link, keine Fehler', async ({ page, problems }) => {
  await page.goto('./');
  await page.locator('.post-card h3 a').first().click();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('.post__meta')).toContainText(/Tag \d+/);
  await expect(page.locator('.avatar')).toBeVisible();
  const back = page.getByRole('link', { name: 'Alle Beiträge' });
  await expect(back).toBeVisible();
  await page.waitForLoadState('networkidle');
  expectNoProblems(problems);
  await back.click();
  await expect(page).toHaveURL(/#entradas$/);
});

test('Übersetzungsschalter blendet aus und ein (Maus und Tastatur)', async ({ page }) => {
  await page.goto(ALL[0].url);
  const btn = page.getByRole('button', { name: 'Übersetzung ausblenden' });
  const panel = page.locator('[data-translation]');
  await expect(btn).toHaveAttribute('aria-expanded', 'true');
  await expect(panel).toBeVisible();
  await btn.click();
  await expect(panel).toBeHidden();
  await expect(page.getByRole('button', { name: 'Übersetzung einblenden' })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  await page.getByRole('button', { name: 'Übersetzung einblenden' }).focus();
  await page.keyboard.press('Enter');
  await expect(panel).toBeVisible();
  await page.keyboard.press('Space');
  await expect(panel).toBeHidden();
});

test('Original links, Übersetzung rechts am Computer; untereinander am Handy', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(ALL[0].url);
  let o = (await page.locator('[data-original]').boundingBox())!;
  let t = (await page.locator('[data-translation]').boundingBox())!;
  expect(o.x).toBeLessThan(t.x);
  await page.setViewportSize({ width: 390, height: 844 });
  o = (await page.locator('[data-original]').boundingBox())!;
  t = (await page.locator('[data-translation]').boundingBox())!;
  expect(t.y).toBeGreaterThan(o.y);
});

test('Lange Texte sind gekürzt und lassen sich je Kachel einzeln aufklappen', async ({ page }) => {
  await page.goto(PREVIEW_URL + 'entradas/2026-11-25-texto-largo/');
  const orig = page.locator('[data-clamp]').first();
  const trans = page.locator('[data-clamp]').nth(1);
  const origBtn = page.getByRole('button', { name: /Mehr anzeigen.*Original/ });
  const transBtn = page.getByRole('button', { name: /Mehr anzeigen.*Übersetzung/ });
  const fullOrig = (await orig.boundingBox())!.height;
  await expect(orig).toHaveAttribute('data-state', 'collapsed');
  await expect(trans).toHaveAttribute('data-state', 'collapsed');
  expect(fullOrig).toBeLessThan(260);
  // Der ganze Text bleibt im DOM
  expect((await page.locator('[data-original]').textContent())!.length).toBeGreaterThan(2000);
  await origBtn.click();
  await expect(orig).toHaveAttribute('data-state', 'open');
  await expect(trans).toHaveAttribute('data-state', 'collapsed'); // unabhängig
  expect((await orig.boundingBox())!.height).toBeGreaterThan(fullOrig * 2);
  await expect(page.getByRole('button', { name: /Weniger anzeigen.*Original/ })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await transBtn.click();
  await expect(trans).toHaveAttribute('data-state', 'open');
  await page.getByRole('button', { name: /Weniger anzeigen.*Original/ }).click();
  await expect(orig).toHaveAttribute('data-state', 'collapsed');
});

test('Kurze Texte haben keinen „Mehr anzeigen“-Knopf', async ({ page }) => {
  await page.goto(PREVIEW_URL + 'entradas/2026-11-23-entrada-de-ejemplo/');
  await expect(page.locator('[data-more]:visible')).toHaveCount(0);
  await expect(page.locator('[data-clamp][data-state]')).toHaveCount(0);
});

test.describe('ohne JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('Beitrag mit Original und Übersetzung lesbar, Schalter verborgen', async ({ page }) => {
    await page.goto(ALL[0].url);
    await expect(page.locator('[data-original]')).toBeVisible();
    await expect(page.locator('[data-translation]')).toBeVisible();
    await expect(page.getByRole('button', { name: /Übersetzung/ })).toBeHidden();
    await expect(page.locator('[data-more]:visible')).toHaveCount(0); // ohne JS nichts gekürzt
  });
});

test('Sonderzeichen werden als Text angezeigt, nicht als HTML', async ({ page }) => {
  const dialogs: string[] = [];
  page.on('dialog', (d) => {
    dialogs.push(d.message());
    void d.dismiss();
  });
  await page.goto(PREVIEW_URL + 'entradas/2026-11-27-caracteres/');
  await expect(page.locator('[data-original] b')).toHaveCount(0);
  await expect(page.locator('[data-original] script')).toHaveCount(0);
  await expect(page.locator('[data-original]')).toContainText('<b>no negrita</b>');
  expect(dialogs).toEqual([]);
});
