// Generates every result-copy variant the app can serve, validates it, and writes
// both a machine file the server reads and a Markdown file a person reviews.
//
// Why this exists: the validator in lib/generate.js can only enforce absence
// rules. "Grammatically compliant but lifeless" passes every regex, so the last
// layer of quality control has to be an eye on the actual strings. That is only
// tractable because the output space is finite — 576 answer paths collapse to 448
// unique generations, since cacheKey() keys on role_type|role_fn and the ten role
// options reduce to seven distinct pairs.
//
// Once data/result-copy.json exists, generate.js serves from it and makes no API
// call, so nothing unreviewed ever reaches a visitor.
//
// Run:
//   node scripts/pregen.mjs              # write both files
//   node scripts/pregen.mjs --limit 12   # smoke test a handful first
//   node scripts/pregen.mjs --force      # overwrite an existing reviewed file

import '../lib/env.js';
import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateResultCopy, apiEnabled, validate, joinPoints, MODEL } from '../lib/generate.js';
import { softWarnings } from '../lib/tone.js';
import { QUESTIONS, deriveVariables } from '../public/quiz-data.js';

const DATA_DIR = fileURLToPath(new URL('../data/', import.meta.url));
const JSON_OUT = join(DATA_DIR, 'result-copy.json');
const REVIEW_OUT = join(DATA_DIR, 'result-copy-review.md');

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const value = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? null : argv[i + 1];
};

const LIMIT = Number(value('limit')) || Infinity;
const CONCURRENCY = Number(process.env.PREGEN_CONCURRENCY) || 6;

export function cacheKey(v) {
  return [v.role_type, v.role_fn, v.altitude, v.ai_level, v.aspiration_to].join('|');
}

/** One representative variable set per unique cache key. */
function allVariants() {
  const byKey = new Map();
  const roles = QUESTIONS[0].options;
  for (let a = 0; a < roles.length; a += 1) {
    if (roles[a].exit) continue;
    for (let b = 0; b < 4; b += 1) {
      for (let c = 0; c < 4; c += 1) {
        for (let d = 0; d < 4; d += 1) {
          const vars = deriveVariables([a, b, c, d]);
          if (!vars) continue;
          const key = cacheKey(vars);
          if (!byKey.has(key)) byKey.set(key, vars);
        }
      }
    }
  }
  return [...byKey.entries()];
}

/** Runs `worker` over `items` with at most `n` in flight. */
async function pool(items, n, worker) {
  const results = new Array(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(n, items.length) }, async () => {
    while (next < items.length) {
      const i = next;
      next += 1;
      results[i] = await worker(items[i], i);
    }
  });
  await Promise.all(runners);
  return results;
}

async function main() {
  if (!apiEnabled) {
    console.error('No OPENROUTER_API_KEY — every variant would come back as fallback copy.');
    console.error('Set it in .env, or run scripts/check-copy.mjs to check the fallback instead.');
    process.exit(1);
  }

  // Overwriting is the destructive step here: the existing file may carry hand
  // edits made during review, and those are worth more than a fresh generation.
  if (!flag('force')) {
    try {
      const existing = JSON.parse(await readFile(JSON_OUT, 'utf8'));
      console.error(`${JSON_OUT} already exists with ${Object.keys(existing.copy ?? {}).length} variants.`);
      console.error('Any review edits in it would be lost. Re-run with --force to overwrite.');
      process.exit(1);
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  }

  const variants = allVariants().slice(0, LIMIT);
  console.log(`Generating ${variants.length} variants via ${MODEL}, ${CONCURRENCY} at a time.\n`);

  let done = 0;
  const rows = await pool(variants, CONCURRENCY, async ([key, vars]) => {
    const copy = await generateResultCopy(vars, { useFrozen: false });
    done += 1;
    if (done % 25 === 0 || done === variants.length) {
      console.log(`  ${done}/${variants.length}`);
    }
    return {
      key,
      vars,
      gap_points: copy.gap_points,
      ai_body: copy.ai_body,
      // `fallback` means two model attempts both failed validation. Those are the
      // rows to read first: the prompt is losing on that combination.
      source: copy.source ?? 'model',
      warnings: [
        ...softWarnings(joinPoints(copy.gap_points)).map((w) => `gap: ${w}`),
        ...softWarnings(copy.ai_body).map((w) => `ai: ${w}`),
      ],
    };
  });

  await mkdir(DATA_DIR, { recursive: true });

  const copyByKey = Object.fromEntries(rows.map((r) => [r.key, { gap_points: r.gap_points, ai_body: r.ai_body }]));
  await writeFile(
    JSON_OUT,
    // `generated_by` is informational; hand edits after review are expected and
    // are exactly the point of the file.
    `${JSON.stringify({ generated_by: MODEL, variants: rows.length, copy: copyByKey }, null, 2)}\n`,
  );

  await writeFile(REVIEW_OUT, renderReview(rows));

  const fallbacks = rows.filter((r) => r.source === 'fallback');
  const warned = rows.filter((r) => r.warnings.length);
  // Belt and braces: everything written should already pass, since a failing draft
  // is what triggers the fallback in the first place.
  const invalid = rows.filter((r) => validate(r));

  console.log(`\n${rows.length} variants written to data/result-copy.json`);
  console.log(`Review file: data/result-copy-review.md`);
  console.log(`  model-written: ${rows.length - fallbacks.length}`);
  console.log(`  fell back after 2 tries: ${fallbacks.length}`);
  console.log(`  soft warnings (advisory): ${warned.length}`);
  if (invalid.length) console.log(`  FAILING hard rules: ${invalid.length}`);

  const counts = new Map();
  for (const r of warned) for (const w of r.warnings) {
    const kind = w.replace(/"[^"]*"|\d+/g, 'N').trim();
    counts.set(kind, (counts.get(kind) ?? 0) + 1);
  }
  if (counts.size) {
    console.log('\nMost common warnings:');
    for (const [kind, n] of [...counts].sort((a, b) => b[1] - a[1]).slice(0, 8)) {
      console.log(`  ${String(n).padStart(4)}  ${kind}`);
    }
  }
}

/**
 * Grouped by role so the copy reads as columns of near-repetition — which is what
 * makes 448 rows reviewable. Reading down one role group surfaces a formula the
 * model is leaning on far faster than reading in key order.
 */
function renderReview(rows) {
  const groups = new Map();
  for (const r of rows) {
    const g = `${r.vars.role_type} · ${r.vars.role_fn}`;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(r);
  }

  const out = [
    '# Result copy review',
    '',
    `${rows.length} variants from ${MODEL}. Read each role group top to bottom: the`,
    'copy repeats heavily within a group, so a formula the model is over-using shows',
    'up as a column rather than as one bad row.',
    '',
    'Edit the strings in `data/result-copy.json` directly, not here. `⚠` is advisory',
    '(see softWarnings in lib/tone.js); `FALLBACK` means both model attempts broke a',
    'hard rule and the static copy was served instead.',
    '',
  ];

  for (const [group, items] of groups) {
    out.push(`## ${group}`, '');
    items.sort((a, b) =>
      a.vars.altitude - b.vars.altitude
      || a.vars.ai_level - b.vars.ai_level
      || a.vars.aspiration_to.localeCompare(b.vars.aspiration_to));
    for (const r of items) {
      const tags = [
        `altitude ${r.vars.altitude}`,
        `ai ${r.vars.ai_level}`,
        `→ ${r.vars.aspiration_to}`,
        r.source === 'fallback' ? '**FALLBACK**' : null,
      ].filter(Boolean).join(' · ');
      out.push(`### ${tags}`, '');
      out.push('**Untuk sampai ke sana**', '');
      for (const p of r.gap_points) out.push(`- ${p}`);
      out.push('');
      out.push(`**Bagaimana AI bisa membantumu** — ${r.ai_body}`, '');
      if (r.warnings.length) out.push(`⚠ ${r.warnings.join(' · ')}`, '');
    }
  }

  return `${out.join('\n')}\n`;
}

await main();
