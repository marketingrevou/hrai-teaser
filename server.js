// Strategic HR with AI — teaser quiz server.
//
// Serves the static chat UI and one endpoint:
//   POST /api/track  → one analytics event per answer, appended to data/events.jsonl
//
// The result copy is a lookup in public/result-copy.js and is resolved in the
// browser, so the reveal makes no request and has nothing to fail.

import './lib/env.js'; // must precede modules that read process.env at load time
import { createServer } from 'node:http';
import { readFile, appendFile, mkdir } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PUBLIC_DIR = join(ROOT, 'public');
const DATA_DIR = join(ROOT, 'data');
const PORT = Number(process.env.PORT) || 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
};

const TRACKED_FIELDS = new Set([
  'event',
  'screen',
  'role',
  'role_type',
  'ai_level',
  'aspiration',
  'completed',
  'exited_non_hr',
  'oh_clicked',
  'other_programs_clicked',
  'session',
]);

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

async function readJsonBody(req, limit = 8_000) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error('body too large');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function handleTrack(req, res) {
  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return json(res, 400, { error: 'invalid body' });
  }

  // Fires on every question answered, not only on completion, so drop-off is
  // visible per screen (spec §5).
  const record = { ts: new Date().toISOString() };
  for (const [k, v] of Object.entries(body ?? {})) {
    if (TRACKED_FIELDS.has(k) && (typeof v !== 'string' || v.length <= 200)) record[k] = v;
  }

  try {
    await mkdir(DATA_DIR, { recursive: true });
    await appendFile(join(DATA_DIR, 'events.jsonl'), `${JSON.stringify(record)}\n`);
  } catch (err) {
    console.warn('[track] write failed:', err.message);
  }
  res.writeHead(204).end();
}

async function serveStatic(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const rel = url.pathname === '/' ? 'index.html' : normalize(url.pathname).replace(/^(\.\.[/\\])+/, '');
  const filePath = join(PUBLIC_DIR, rel);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    return res.writeHead(403).end('Forbidden');
  }

  // Extensionless paths fall back to the .html file, so /hasil?a=… stays clean.
  // A static host needs the equivalent (Vercel: `cleanUrls`).
  const candidates = extname(filePath) ? [filePath] : [filePath, `${filePath}.html`];

  for (const candidate of candidates) {
    let file;
    try {
      file = await readFile(candidate);
    } catch {
      continue;
    }
    res.writeHead(200, {
      'content-type': MIME[extname(candidate)] ?? 'application/octet-stream',
      'cache-control': 'no-cache',
    });
    return res.end(file);
  }

  res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Not found');
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'POST' && req.url === '/api/track') return await handleTrack(req, res);
    if (req.method === 'GET' && req.url === '/api/health') return json(res, 200, { ok: true });
    if (req.method === 'GET' || req.method === 'HEAD') return await serveStatic(req, res);
    res.writeHead(405).end('Method not allowed');
  } catch (err) {
    console.error('[server]', err);
    if (!res.headersSent) json(res, 500, { error: 'internal error' });
  }
});

server.listen(PORT, () => {
  console.log(`hr-path-teaser → http://localhost:${PORT}`);
});
