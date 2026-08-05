// Strategic HR with AI — teaser quiz server.
//
// Serves the static chat UI and two endpoints:
//   POST /api/reveal  → the two LLM-generated result blocks
//   POST /api/track   → one analytics event per answer, appended to data/events.jsonl
//
// The API key stays server-side; the browser never sees it.

import './lib/env.js'; // must precede modules that read process.env at load time
import { createServer } from 'node:http';
import { readFile, appendFile, mkdir } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateResultCopy, apiEnabled, cacheStats, frozenStats, MODEL } from './lib/generate.js';
import { deriveVariables } from './public/quiz-data.js';

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
  'altitude',
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

const isIndex = (v) => Number.isInteger(v) && v >= 0 && v < 10;

async function handleReveal(req, res) {
  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return json(res, 400, { error: 'invalid body' });
  }

  const answers = body?.answers;
  if (!Array.isArray(answers) || answers.length !== 4 || !answers.every(isIndex)) {
    return json(res, 400, { error: 'answers must be four indices' });
  }

  // Indices only — the variables are derived server-side from the canonical
  // table, so nothing a visitor types can reach the model.
  const vars = deriveVariables(answers);
  if (!vars) return json(res, 400, { error: 'invalid answer combination' });

  const copy = await generateResultCopy(vars);
  return json(res, 200, {
    role_label: vars.role_label,
    aspiration_to: vars.aspiration_to,
    gap_body: copy.gap_body,
    ai_body: copy.ai_body,
    source: copy.source ?? 'model',
  });
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
    if (req.method === 'POST' && req.url === '/api/reveal') return await handleReveal(req, res);
    if (req.method === 'POST' && req.url === '/api/track') return await handleTrack(req, res);
    if (req.method === 'GET' && req.url === '/api/health') {
      return json(res, 200, {
        ok: true, model_enabled: apiEnabled, model: MODEL, ...cacheStats(), ...frozenStats(),
      });
    }
    if (req.method === 'GET' || req.method === 'HEAD') return await serveStatic(req, res);
    res.writeHead(405).end('Method not allowed');
  } catch (err) {
    console.error('[server]', err);
    if (!res.headersSent) json(res, 500, { error: 'internal error' });
  }
});

server.listen(PORT, () => {
  console.log(`hr-path-teaser → http://localhost:${PORT}`);
  console.log(
    apiEnabled
      ? `OpenRouter: enabled → ${MODEL}`
      : 'OpenRouter: no OPENROUTER_API_KEY found — serving reviewed static result copy.\n' +
          '  Set OPENROUTER_API_KEY in .env to switch on generated copy.',
  );
});
