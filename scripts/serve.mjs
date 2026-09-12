/**
 * Production-like local preview: serves the built `dist/` output with an SPA
 * fallback and mounts the same /api handlers Vercel deploys as functions.
 *
 * The handlers are TypeScript, so they're bundled on the fly with esbuild
 * (already present as Vite's own dependency) into a temp dir and imported.
 *
 * Usage: npm run build && npm run preview  (PORT env overrides 4173)
 */

import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
const port = Number(process.env.PORT) || 4173;

if (!existsSync(join(dist, 'index.html'))) {
  console.error('dist/index.html not found — run `npm run build` first.');
  process.exit(1);
}

const outDir = await mkdtemp(join(tmpdir(), 'orbital-api-'));
await build({
  entryPoints: ['apod', 'neo', 'iss'].map((name) => join(root, 'api', `${name}.ts`)),
  outdir: outDir,
  bundle: true,
  platform: 'node',
  format: 'esm',
  logLevel: 'silent',
});

const routes = new Map();
for (const name of ['apod', 'neo', 'iss']) {
  const module = await import(pathToFileURL(join(outDir, `${name}.js`)).href);
  routes.set(`/api/${name}`, module.default);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

const server = createServer(async (req, res) => {
  const path = decodeURIComponent((req.url ?? '/').split('?')[0]);

  const handler = routes.get(path);
  if (handler) {
    try {
      await handler(req, res);
    } catch (error) {
      console.error(error);
      if (!res.headersSent) res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: { code: 'internal', message: 'Handler crashed.' } }));
    }
    return;
  }

  // Static files with SPA fallback, confined to dist/.
  const safePath = normalize(path).replace(/^(\.\.[/\\])+/, '');
  let filePath = join(dist, safePath);
  if (!filePath.startsWith(dist) || !existsSync(filePath) || extname(filePath) === '') {
    filePath = join(dist, 'index.html');
  }
  try {
    const body = await readFile(filePath);
    res.writeHead(200, { 'content-type': MIME[extname(filePath)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Not found');
  }
});

server.listen(port, () => {
  console.log(`orbital preview → http://localhost:${port}`);
});

process.on('SIGINT', async () => {
  await rm(outDir, { recursive: true, force: true });
  process.exit(0);
});
