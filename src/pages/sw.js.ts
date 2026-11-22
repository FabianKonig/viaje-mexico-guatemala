/**
 * Service Worker (wird beim Build erzeugt).
 * - HTML: network-first (immer aktuell, offline die zuletzt gesehene Fassung)
 * - Bilder, Schriften, gehashte Assets (_astro): cache-first
 * - Cache-Namen mit Basispfad und Version; beim Aktivieren werden alte Caches desselben Basispfads gelöscht
 * - kein skipWaiting: eine neue Version wird beim nächsten Besuch aktiv
 * - in Vorschauen: Service Worker, der sich selbst abmeldet
 */
import type { APIRoute } from 'astro';
import { cachePrefix, cachesToDelete, serviceWorkerEnabled, shouldHandle } from '../lib/pwa';
import { BASE } from '../lib/site';

const VERSION = (process.env.GITHUB_SHA || String(Date.now())).slice(0, 12);

const KILL_SWITCH = `self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.registration.unregister()));
`;

function serviceWorker(): string {
  return `/* Service Worker – Version ${VERSION} */
'use strict';
const VERSION = ${JSON.stringify(VERSION)};
const SCOPE = self.registration.scope;
const PREFIX = (${cachePrefix.toString()})(new URL(SCOPE).pathname);
const PAGES = PREFIX + 'pages-' + VERSION;
const ASSETS = PREFIX + 'assets-' + VERSION;
const MAX_PAGES = 40;
const MAX_ASSETS = 120;
const cachesToDelete = ${cachesToDelete.toString()};
const shouldHandle = ${shouldHandle.toString()};

const OFFLINE_HTML = '<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex, nofollow, noimageindex"><title>Offline</title><body style="font-family:system-ui,sans-serif;background:#F6EBD9;color:#2B1D16;padding:24px"><h1>Gerade offline</h1><p>Diese Seite war noch nicht gespeichert. Bitte später noch einmal versuchen.</p><p><a href="' + SCOPE + '">Zur Startseite</a></p></body></html>';

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(PAGES).then((c) => c.add(new Request(SCOPE, { cache: 'reload' }))).catch(() => undefined));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(cachesToDelete(keys, PREFIX, [PAGES, ASSETS]).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function isPage(request) {
  return request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html');
}

function isAsset(request, url) {
  return request.destination === 'image' || request.destination === 'font' || url.pathname.includes('/_astro/') || url.pathname.includes('/media/') || url.pathname.includes('/fonts/') || url.pathname.includes('/icons/');
}

async function networkFirst(request) {
  const cache = await caches.open(PAGES);
  try {
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') {
      await cache.put(request, response.clone());
      trim(PAGES, MAX_PAGES);
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    return new Response(OFFLINE_HTML, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(ASSETS);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok && response.type === 'basic') {
    await cache.put(request, response.clone());
    trim(ASSETS, MAX_ASSETS);
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (!shouldHandle(request.url, request.method, SCOPE)) return;
  const url = new URL(request.url);
  if (url.pathname.endsWith('/sw.js')) return;
  if (isPage(request)) event.respondWith(networkFirst(request));
  else if (isAsset(request, url)) event.respondWith(cacheFirst(request));
});
`;
}

export const GET: APIRoute = () =>
  new Response(serviceWorkerEnabled(BASE, process.env.PREVIEW) ? serviceWorker() : KILL_SWITCH, {
    headers: { 'Content-Type': 'text/javascript; charset=utf-8' },
  });
