// Walks every answer path the app can serve and checks the copy it resolves to.
// Run: node scripts/check-copy.mjs
//
// The strings are hand-written and reviewed, so this is not the constraint gate
// the generated copy needed. What is still worth automating is the wiring: that
// every reachable combination lands on a real string, that no placeholder ever
// survives substitution, and that the handful of bans which are about the brand
// rather than about steering a model still hold.

import { QUESTIONS, deriveVariables } from '../public/quiz-data.js';
import { resultCopy } from '../public/result-copy.js';

// Absence rules only, and only the ones a person can still break by hand. The
// word caps, "kamu perlu", "sekadar" and the loanword list went with the model:
// they existed to bound generation, and the approved copy breaks three of them.
const BANNED = [
  [/[—–]/, 'em or en dash'],
  [/\bAnda\b/, '"Anda" instead of "kamu"'],
  [/Bapak\s*\/?\s*Ibu/i, '"Bapak/Ibu"'],
  [/\b\d+\s*(minggu|bulan|tahun|hari)\b/i, 'timeframe promise'],
  [/setelah\s+program/i, '"setelah program"'],
  [/\bRp\s*\d/i, 'rupiah figure'],
  [/\b\d+([.,]\d+)?\s*(juta|ribu|miliar|persen|%)/i, 'salary or outcome figure'],
  [/(gantikan|menggantikan|pengganti)\s+(orang|tim|headcount|karyawan)/i, 'AI-replaces-headcount framing'],
];

let failures = 0;
let checked = 0;

const fail = (msg) => { console.error(`FAIL ${msg}`); failures += 1; };

const [roles, ais, aspirations] = QUESTIONS.map((q) => q.options);

for (let q1 = 0; q1 < roles.length; q1 += 1) {
  if (roles[q1].exit) continue;
  for (let q2 = 0; q2 < ais.length; q2 += 1) {
    for (let q3 = 0; q3 < aspirations.length; q3 += 1) {
      const path = [q1, q2, q3];
      const vars = deriveVariables(path);
      if (!vars) { fail(`derive returned null: ${path}`); continue; }

      const where = `${vars.role_type}|${vars.role_fn}|ai ${vars.ai_level}|${vars.aspiration}`;
      const copy = resultCopy(vars);
      checked += 1;

      for (const block of ['gap_body', 'ai_body']) {
        const text = copy[block];
        if (!text?.trim()) { fail(`${where}: ${block} empty`); continue; }
        // A surviving placeholder is the one failure mode substitution can have,
        // and it would ship a literal "{fn}" to a visitor.
        if (/\{(fn|to)\}/.test(text)) fail(`${where}: ${block} has an unsubstituted placeholder`);
        for (const [pattern, label] of BANNED) {
          if (pattern.test(text)) fail(`${where}: ${block} ${label}`);
        }
      }
    }
  }
}

// The non-HR exit has no result and must never derive one.
const exitIndex = roles.findIndex((o) => o.exit);
if (exitIndex === -1) fail('no exit option in the role question');
else if (deriveVariables([exitIndex, 0, 0]) !== null) fail('exit option produced variables');

// Out-of-range indices are what a hand-edited /hasil URL looks like.
if (deriveVariables([roles.length, 0, 0]) !== null) fail('out-of-range role index produced variables');
if (deriveVariables([0, 0, aspirations.length]) !== null) fail('out-of-range aspiration index produced variables');

console.log(`${checked} combinations checked, ${failures} failure(s)`);
process.exit(failures ? 1 : 0);
