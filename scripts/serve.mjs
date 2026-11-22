#!/usr/bin/env node
/**
 * Minimaler statischer Server, der sich wie GitHub Pages verhält (ohne Abhängigkeiten).
 * Aufruf: node scripts/serve.mjs <ordner> <port> [mount-pfad]
 *   z. B. node scripts/serve.mjs dist 4321
 *         node scripts/serve.mjs dist-preview 4322 /pr-preview/pr-1/
 * - "/x/" liefert "/x/index.html", "/x" leitet auf "/x/" um (wenn Ordner)
 * - unbekannte Pfade liefern 404.html mit Status 404
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const [, , dirArg = 'dist', portArg = '4321', mountArg = '/'] = process.argv;
const root = path.resolve(dirArg);
const port = Number(portArg);
let mount = mountArg.startsWith('/') ? mountArg : '/' + mountArg;
if (!mount.endsWith('/')) mount += '/';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

function send(res, status, file, method) {
  const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
  const body = fs.readFileSync(file);
  res.writeHead(status, {
    'Content-Type': type,
    'Content-Length': body.length,
    'Cache-Control': 'no-cache',
  });
  res.end(method === 'HEAD' ? undefined : body);
}

function notFound(res, method) {
  const page = path.join(root, '404.html');
  if (fs.existsSync(page)) return send(res, 404, page, method);
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404');
}

const server = http.createServer((req, res) => {
  const method = req.method || 'GET';
  const url = new URL(req.url || '/', 'http://localhost');
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return notFound(res, method);
  }
  if (mount !== '/' && pathname + '/' === mount) {
    res.writeHead(301, { Location: mount });
    return res.end();
  }
  if (!pathname.startsWith(mount)) return notFound(res, method);
  const rel = pathname.slice(mount.length);
  const file = path.join(root, rel);
  if (!file.startsWith(root)) return notFound(res, method);
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    if (!pathname.endsWith('/')) {
      res.writeHead(301, { Location: pathname + '/' + url.search });
      return res.end();
    }
    const index = path.join(file, 'index.html');
    return fs.existsSync(index) ? send(res, 200, index, method) : notFound(res, method);
  }
  if (fs.existsSync(file)) return send(res, 200, file, method);
  if (fs.existsSync(file + '.html')) return send(res, 200, file + '.html', method);
  return notFound(res, method);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Serving ${root} at http://127.0.0.1:${port}${mount}`);
});
