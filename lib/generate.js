// Generates the two result-screen blocks (gap_points, ai_body) via OpenRouter.
//
// Design notes:
// - OpenRouter's /chat/completions is OpenAI-compatible, so this is one plain
//   fetch with no SDK dependency.
// - Structured outputs (response_format: json_schema, strict) guarantee we get
//   exactly two strings back, so there is no parsing guesswork and no risk of the
//   model wrapping copy in prose.
// - Every response is validated against the hard constraints in the spec (§4).
//   Anything that fails validation is discarded in favour of the static copy —
//   this is a public marketing asset, so an unreviewable violation must never ship.
// - Results are cached by combination key. The spec recommends pre-generating and
//   serving statically; this cache is the live-generation equivalent, so the second
//   visitor in a given combination pays no latency and no token cost.

import { readFileSync } from 'node:fs';
import { fallbackCopy } from './copy.js';
import { VOICE_PROMPT, hardViolations } from './tone.js';

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
// The gap block is two sentences: what do I already have, and what does the next
// level ask. The third beat — where my room is — folds into the second rather than
// being dropped, because altitude is otherwise the one quiz answer that reaches no
// copy at all (ai_body reads ai_level only) while cacheKey still keys on it, which
// would spend generations on variants that cannot differ. Capped per bullet rather
// than per block — a long bullet stops being scannable, which is the only reason to
// prefer bullets over the paragraph this used to be.
const GAP_POINTS = 2;
const GAP_POINT_WORD_CAP = 14;
const AI_WORD_CAP = 45;

// Any OpenRouter slug works. See https://openrouter.ai/models
export const MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-3.6-flash';
// Reasoning depth. Low keeps the turn short: this is tightly-specified microcopy,
// not open-ended reasoning. Raise to medium via env if the copy reads thin.
const EFFORT = process.env.RESULT_EFFORT || 'low';
const API_KEY = process.env.OPENROUTER_API_KEY;
const TIMEOUT_MS = Number(process.env.OPENROUTER_TIMEOUT_MS) || 30_000;

export const apiEnabled = Boolean(API_KEY);

const SYSTEM_PROMPT = `Kamu menulis dua blok copy pendek untuk halaman hasil sebuah app teaser RevoU, program "Strategic HR with AI".

Pembacanya adalah praktisi HR di Indonesia yang baru menjawab empat pertanyaan tentang pekerjaannya. Halaman hasil menunjukkan jarak antara posisinya sekarang dan yang dia kejar. Kamu menulis dua blok itu.

# Output

gap_points — tepat dua poin. Satu poin maksimum ${GAP_POINT_WORD_CAP} kata, keras.
ai_body — satu paragraf pendek, dua kalimat. Maksimum ${AI_WORD_CAP} kata, keras.

Judul kedua blok sudah ditetapkan di halaman ("Untuk sampai ke sana" dan "Bagaimana AI bisa membantumu"). Jangan menulis judul, jangan mengulang judul di dalam isi.

# Aturan gap_points

Pakai bahasa sederhana. Kata sehari-hari, bukan kata kantor. Satu poin satu gagasan, dan poin itu harus bisa dibaca sendirian tanpa poin sebelumnya. Jangan memotong satu paragraf menjadi dua. Jangan menulis tanda "-" atau angka di depan poin, halaman yang menambahkannya.

Poin satu menyebut apa yang sudah dia punya. Sebut spesifik pakai role_fn atau role_type. Jangan pernah membuka dengan kekurangan.

Poin dua menyebut apa yang diminta level berikutnya, dan di klausa yang sama menyebut di mana ruangnya. Levelnya yang menuntut, bukan orangnya yang kurang. Tulis "level berikutnya minta cakupan yang lebih luas", bukan "kamu kurang cakupan". Dua gagasan ini satu kalimat, jadi keduanya harus pendek: yang diminta dulu, lalu ruangnya, disambung "dan", "karena", atau "sejak".

Ruangnya ditentukan altitude, dan hanya jarak antara levelnya dengan level di atasnya. Sampaikan gagasannya dengan kata-katamu sendiri:
- altitude 1 atau 2: dia masuk setelah arahnya diputuskan, ruangnya ada di masuk lebih awal
- altitude 3: dia menyusun opsi, ruangnya ada di ikut menentukan arah
- altitude 4: dia sudah duduk di ruang keputusan, jadi yang membedakan sekarang isi jawabannya

role_type menentukan poin dua:
- spec: dia punya kedalaman, yang diminta berikutnya keluasan
- gen: dia punya keluasan, yang diminta berikutnya kedalaman
- new: posisikan sebagai kebebasan, bukan kekurangan; yang diminta adalah belajar melihat HR sebagai satu sistem

# Aturan ai_body

Satu paragraf, bahasa sederhana, dan langsung menjawab judulnya: apa yang berubah untuk dia karena AI. Bahas ai_level saja. Jangan mengulang apa pun dari gap_points. Sampaikan gagasannya dengan kata-katamu sendiri:
- level 1: ada pekerjaan HR yang dulu terlalu lambat untuk dia mulai, sekarang bisa jalan, dan pekerjaan itu yang menaikkan posisi orang
- level 2: menulis adalah bagian paling kecil dari AI, yang mengubah posisi adalah analisis yang dulu dibawa ke konsultan
- level 3: batas berikutnya adalah membangun sendiri tools yang dipakai timnya, tanpa menunggu IT
- level 4: yang jarang adalah dia melakukan itu sambil memegang keputusan di seluruh fungsi HR

# Batasan keras, berlaku untuk kedua output

Tidak ada janji jangka waktu. Jangan pernah menulis "dalam 15 minggu", "setelah program", atau varian apa pun yang menyiratkan perubahan posisi pada tanggal tertentu.
Tidak ada angka gaji atau angka hasil.
Tidak ada penghinaan. Jangan menyatakan atau menyiratkan orangnya junior, tertinggal, bisa digantikan, atau tidak cukup baik. Registernya "ini yang diminta level berikutnya", bukan "ini yang salah dari kamu".
Tidak ada framing AI menggantikan headcount. AI adalah leverage untuk individu, bukan pengganti orang HR. Ini audiens HR.
Tidak ada tanda hubung panjang. Pakai koma, titik, titik dua.
Tidak ada bahasa Inggris kecuali kata serapan yang sudah dipakai di HR Indonesia: job description, workflow, tools, framework, benchmark.
Sapaan orang kedua "kamu". Jangan "Anda", jangan "Bapak/Ibu".
Tidak ada pertanyaan. Kedua blok ini pernyataan.
Jangan menyebut nama pengajar, harga, atau kompetitor.

${VOICE_PROMPT}

# Larangan gaya yang sering dilanggar

Jangan pakai "sekadar", "bukan sekadar", "hanya", "bukan hanya", atau "jangan hanya" untuk menggambarkan pekerjaannya sekarang. Konstruksi itu mengecilkan pekerjaan yang dia kerjakan hari ini. Setiap level dalam pertanyaan menggambarkan pekerjaan yang sah dan terhormat. Sebut apa yang diminta level berikutnya tanpa merendahkan apa pun yang dia kerjakan sekarang.

Jangan pakai "kamu harus" atau "kamu perlu". Levelnya yang menuntut, bukan kamu yang memerintah dia. Caranya sudah dijelaskan di bagian Suara: jadikan levelnya subjek aktif, jangan lari ke kata benda.

Jangan buka poin satu dengan "Sebagai [role],". Mulai langsung dengan apa yang dia punya.

Patuhi persis satu aturan altitude dan satu aturan ai_level, yaitu yang cocok dengan angkanya. Jangan menggabungkan dua level sekaligus.

Kata bahasa Inggris yang boleh hanya: job description, workflow, tools, framework, benchmark, headcount, turnover, budget. Kata seperti leverage, insight, mindset, skill, upskilling, value, impact tidak boleh. Cari padanan Indonesianya.

# Periksa sebelum membalas

1. Kata "kamu" ada di ai_body, dan ada di gap_points minimal sekali.
2. Tidak ada kalimat yang subjeknya kata benda abstrak.
3. Tidak ada kata bentukan pe-...-an yang punya bentuk kata kerja.
4. Setiap blok menyebut satu hal HR yang konkret.
5. Tidak ada: merupakan, melainkan, namun, adapun, kini, hal ini, teknologi ini, sangat, sekadar, hanya, kamu harus, kamu perlu.
6. Tidak ada kata benda abstrak yang dipakai dua kali dalam satu blok.
7. Tiga poin, tidak lebih dan tidak kurang, masing-masing di bawah ${GAP_POINT_WORD_CAP} kata, dan ai_body di bawah ${AI_WORD_CAP} kata.

Balas hanya dengan JSON sesuai skema. Tanpa penjelasan, tanpa blok kode.`;

const RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: {
    name: 'result_copy',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        gap_points: {
          type: 'array',
          // minItems/maxItems keep the count right at the provider rather than
          // costing a retry; validate() still enforces it for models that ignore
          // the bounds or answer without a schema at all.
          minItems: GAP_POINTS,
          maxItems: GAP_POINTS,
          items: {
            type: 'string',
            description: `Satu poin, maksimum ${GAP_POINT_WORD_CAP} kata, tanpa tanda "-" di depan.`,
          },
          description: `Blok B. Tepat ${GAP_POINTS} poin pendek.`,
        },
        ai_body: {
          type: 'string',
          description: `Blok C. Dua kalimat, maksimum ${AI_WORD_CAP} kata.`,
        },
      },
      required: ['gap_points', 'ai_body'],
      additionalProperties: false,
    },
  },
};

// role_fn is part of the key so sentence one can name the function specifically
// without copy leaking between roles that share a role_type.
function cacheKey(v) {
  return [v.role_type, v.role_fn, v.altitude, v.ai_level, v.aspiration_to].join('|');
}

const cache = new Map();

// Reviewed copy from scripts/pregen.mjs, keyed by the same cacheKey. When this
// file is present it is the whole answer: every string a visitor can see has been
// read by a person, so there is no API call, no latency and no cold-start.
// Loaded once, lazily, so importing this module stays free for check-copy.mjs.
// `FROZEN_COPY=off` is how a deployment says it wants live copy on purpose.
// Without it, a missing result-copy.json is indistinguishable from a deliberate
// choice, and the mode flips out from under the deployment the first time someone
// runs pregen. The flag makes live generation a decision rather than a side effect.
export const liveOnly = () => process.env.FROZEN_COPY === 'off';

let frozenCopy;
function frozen() {
  if (frozenCopy !== undefined) return frozenCopy;
  if (liveOnly()) return (frozenCopy = null);
  try {
    const file = JSON.parse(readFileSync(new URL('../data/result-copy.json', import.meta.url), 'utf8'));
    frozenCopy = file.copy ?? null;
    const n = Object.keys(frozenCopy ?? {}).length;
    console.log(`[reveal] serving ${n} reviewed variants from data/result-copy.json`);
    // Review edits are hand-made and outrank the regexes, so a broken rule here
    // is reported and still served. Silently overriding a human would be worse.
    const bad = Object.entries(frozenCopy).filter(([, c]) => validate(c));
    if (bad.length) console.warn(`[reveal] ${bad.length} reviewed variant(s) break a tone rule; serving anyway`);
  } catch (err) {
    if (err.code !== 'ENOENT') console.warn('[reveal] could not read result-copy.json:', err.message);
    frozenCopy = null;
  }
  return frozenCopy;
}

export const frozenStats = () => ({
  frozen: Object.keys(frozen() ?? {}).length,
  // Distinguishes "no reviewed file yet" from "reviewed file deliberately bypassed",
  // which `frozen: 0` alone cannot.
  frozen_copy: liveOnly() ? 'off' : 'on',
});

const wordCount = (s) => s.trim().split(/\s+/).filter(Boolean).length;

/**
 * The bullets as one block of prose, for the checks that are about the
 * block rather than the line. Exported so pregen's soft warnings read the gap the
 * same way the hard rules do.
 */
export const joinPoints = (points) =>
  points.map((p) => p.trim().replace(/[.;]+$/, '')).join('. ');

const VIOLATIONS = [
  [/[—–]/, 'em dash or en dash'],
  [/\bAnda\b/, '"Anda" instead of "kamu"'],
  [/Bapak\s*\/?\s*Ibu/i, '"Bapak/Ibu"'],
  [/\?/, 'question mark'],
  [/\b\d+\s*(minggu|bulan|tahun|hari)\b/i, 'timeframe promise'],
  [/setelah\s+program/i, '"setelah program"'],
  // Figures, not topics. This used to ban the bare word "gaji", which also ruled
  // out "struktur gaji" — a legitimate HR object, one of the things EXIT.body1
  // already names, and exactly the kind of concrete noun TONE.md R4 asks for.
  // The spec bans salary *numbers* and outcome *numbers*, so that is what these
  // match: a rupiah amount, a magnitude, or a figure next to the word gaji.
  [/\bRp\s*\d/i, 'rupiah figure'],
  [/\b\d+([.,]\d+)?\s*(juta|ribu|miliar|persen|%)/i, 'salary or outcome figure'],
  [/\bgaji\b[^.]{0,24}\d|\d[^.]{0,24}\bgaji\b/i, 'salary figure'],
  [/\bnaik\s+gaji\b|\bgaji\w*\s+(naik|meningkat)\b/i, 'salary-raise promise'],
  [/(gantikan|menggantikan|pengganti)\s+(orang|tim|headcount|karyawan)/i, 'AI-replaces-headcount framing'],
  // "merely / only" diminishes the job the reader does today. Every option in the
  // questionnaire describes a legitimate job (spec §3), so this register is out.
  [/\bsekadar\b|\bsekedar\b/i, '"sekadar" diminishes their current work'],
  // Obligation aimed at the person rather than the level demanding it.
  [/\bkamu\s+(harus|perlu)\b/i, '"kamu harus/perlu" — prescriptive at the reader'],
  // English beyond the loanwords the spec permits.
  // Note: does not ban "operations" or "development" — those appear inside the
  // legitimate role labels "HR Operations" and "Learning & Development".
  // `strategic` is here for a second reason: "Strategic HR with AI" is the program
  // name, which the reveal withholds until the final card, and a smoke test caught
  // the model writing "perubahan strategic HR" in the body.
  [/\b(leverage|insight|insights|mindset|skill|skillset|upskilling|reskilling|value|impact|journey|growth|awareness|capability|operational|strategic)\b/i,
    'English word outside the permitted loanword list'],
];

/**
 * Returns null when the copy is clean, otherwise a reason string for the log.
 * Exported so the static fallback copy can be held to the same bar.
 */
export function validate({ gap_points, ai_body }) {
  if (!Array.isArray(gap_points) || gap_points.length !== GAP_POINTS) {
    return `gap_points must be ${GAP_POINTS} lines`;
  }
  if (gap_points.some((p) => !p?.trim()) || !ai_body?.trim()) return 'empty block';

  // The word and tone rules read the bullets as one block: "kamu" belongs
  // somewhere in the gap, not in every bullet, and an abstraction repeated across
  // two bullets is the same repetition R6 bans inside a paragraph. Joining with a
  // full stop keeps the per-sentence length check measuring one bullet at a time.
  const gapText = joinPoints(gap_points);

  // Collect every violation, not just the first. A retry told about one rule tends
  // to fix it and break another; naming them all in one go converts far more
  // rejections into passes.
  const found = [];
  gap_points.forEach((p, i) => {
    if (wordCount(p) > GAP_POINT_WORD_CAP) found.push(`gap point ${i + 1} over ${GAP_POINT_WORD_CAP} words`);
    // The renderer draws the bullet, so a dash or a number in the string shows up
    // twice on the page.
    if (/^\s*([-*•]|\d+[.)])\s/.test(p)) found.push(`gap point ${i + 1} carries its own bullet marker`);
  });
  if (wordCount(ai_body) > AI_WORD_CAP) found.push(`ai_body over ${AI_WORD_CAP} words`);
  for (const [pattern, label] of VIOLATIONS) {
    if (pattern.test(gapText)) found.push(`gap_points: ${label}`);
    if (pattern.test(ai_body)) found.push(`ai_body: ${label}`);
  }
  // Tone rules (TONE.md). Same treatment as the content rules above: a violation
  // is named back to the model on retry, and unfixable copy loses to the fallback.
  for (const label of hardViolations(gapText)) found.push(`gap_points: ${label}`);
  for (const label of hardViolations(ai_body)) found.push(`ai_body: ${label}`);
  return found.length ? found.join('; ') : null;
}

/**
 * Strict structured outputs should hand back bare JSON, but not every model on
 * OpenRouter honours that perfectly — tolerate a code fence or stray prose.
 */
function extractJson(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('no JSON object in response');
  return JSON.parse(text.slice(start, end + 1));
}

function buildMessages(vars, correction = null) {
  // Anthropic-family models honour explicit cache breakpoints, which need the
  // array content form. Everywhere else send a plain string — not every provider
  // on OpenRouter accepts array-form system content.
  const system = MODEL.startsWith('anthropic/')
    ? [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }]
    : SYSTEM_PROMPT;

  return [
    { role: 'system', content: system },
    {
      role: 'user',
      content: [
        'Tulis kedua blok untuk orang ini.',
        '',
        `role_label: ${vars.role_label}`,
        `role_type: ${vars.role_type}`,
        `role_fn: ${vars.role_fn}`,
        `altitude: ${vars.altitude}`,
        `ai_level: ${vars.ai_level}`,
        `aspiration_to: ${vars.aspiration_to}`,
      ].join('\n'),
    },
    // On a retry, name the rule that was broken. Cheaper and better than
    // discarding the attempt: the model fixes the one thing and keeps the rest.
    ...(correction
      ? [{
          role: 'user',
          content: `Draf sebelumnya ditolak karena melanggar aturan ini: ${correction}. Tulis ulang kedua blok tanpa pelanggaran itu. Patuhi semua batasan lain seperti sebelumnya.`,
        }]
      : []),
  ];
}

/** Turns an OpenRouter failure into a message worth reading in the log. */
function describeFailure(status, body) {
  const detail = body?.error?.message || body?.error || `HTTP ${status}`;
  if (status === 401) return `401 unauthorized — check OPENROUTER_API_KEY (${detail})`;
  if (status === 402) return `402 payment required — OpenRouter credits exhausted (${detail})`;
  if (status === 404) return `404 unknown model "${MODEL}" — see https://openrouter.ai/models (${detail})`;
  if (status === 429) return `429 rate limited (${detail})`;
  return `HTTP ${status}: ${detail}`;
}

/**
 * Some providers reject parts of the JSON Schema dialect we send — Google's
 * responseSchema, for one, has historically not accepted `additionalProperties`.
 * Recognising that lets us retry without the schema instead of failing every
 * call and silently serving fallback copy forever.
 */
function looksLikeSchemaRejection(status, body) {
  if (status !== 400 && status !== 422) return false;
  const detail = String(body?.error?.message ?? body?.error ?? '');
  return /schema|response_format|additionalproperties|json_schema|structured/i.test(detail);
}

async function postCompletion(payload) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      authorization: `Bearer ${API_KEY}`,
      'content-type': 'application/json',
      // Optional attribution on openrouter.ai; harmless when unset.
      ...(process.env.OPENROUTER_SITE_URL && { 'HTTP-Referer': process.env.OPENROUTER_SITE_URL }),
      'X-Title': process.env.OPENROUTER_APP_NAME || 'RevoU HR Path Teaser',
    },
    body: JSON.stringify(payload),
  });
  return { res, body: await res.json().catch(() => null) };
}

/**
 * @param {{role_label: string, role_type: 'gen'|'spec'|'new', role_fn: string,
 *          altitude: 1|2|3|4, ai_level: 1|2|3|4, aspiration_to: string}} vars
 */
/**
 * One round trip. Resolves to `{copy}` on success or `{reason}` when the copy
 * came back but broke a rule — the caller uses `reason` to steer a retry.
 */
async function attempt(vars, correction) {
  const payload = {
    model: MODEL,
    // Headroom for reasoning plus the two short strings; a truncated response
    // would fail JSON parsing and fall back for no reason.
    max_tokens: 4096,
    // `reasoning.effort` is the portable form — Gemini supports `reasoning`
    // but not the OpenAI-style `reasoning_effort`, which OpenRouter would
    // silently drop, leaving depth uncontrolled.
    reasoning: { effort: EFFORT },
    response_format: RESPONSE_FORMAT,
    messages: buildMessages(vars, correction),
  };

  let { res, body } = await postCompletion(payload);

  // Retry without the schema rather than fail permanently. The prompt already
  // asks for bare JSON, extraction is tolerant, and the validator still gates
  // whatever comes back — so this degrades cleanly instead of going dark.
  if (looksLikeSchemaRejection(res.status, body)) {
    console.warn(`[reveal] ${MODEL} rejected the JSON schema; retrying without response_format`);
    const { response_format, ...noSchema } = payload;
    ({ res, body } = await postCompletion(noSchema));
  }

  if (!res.ok) throw new Error(describeFailure(res.status, body));
  // OpenRouter can also report an error inside a 200 response.
  if (body?.error) throw new Error(body.error.message ?? String(body.error));

  const choice = body?.choices?.[0];
  if (choice?.finish_reason === 'length') throw new Error('response truncated');

  const text = choice?.message?.content;
  if (!text?.trim()) throw new Error('empty completion');

  const parsed = extractJson(text);
  const reason = validate(parsed);
  if (reason) return { reason };

  return {
    copy: {
      gap_points: parsed.gap_points.map((p) => p.trim()),
      ai_body: parsed.ai_body.trim(),
      source: 'model',
    },
  };
}

/**
 * @param {{role_label: string, role_type: 'gen'|'spec'|'new', role_fn: string,
 *          altitude: 1|2|3|4, ai_level: 1|2|3|4, aspiration_to: string}} vars
 */
export async function generateResultCopy(vars, { useFrozen = true } = {}) {
  const key = cacheKey(vars);

  // Reviewed copy wins over everything, including the live model. pregen passes
  // useFrozen: false so regenerating does not just read back its own output.
  if (useFrozen) {
    const reviewed = frozen()?.[key];
    if (reviewed) return { ...reviewed, source: 'reviewed' };
  }

  if (cache.has(key)) return { ...cache.get(key), cached: true };

  if (!apiEnabled) return fallbackCopy(vars);

  let correction = null;
  // Two attempts: the first cold, the second told what it broke. Beyond that the
  // static copy is the better answer than a third roll of the dice.
  for (let i = 0; i < 2; i += 1) {
    try {
      const { copy, reason } = await attempt(vars, correction);
      if (copy) {
        cache.set(key, copy);
        return copy;
      }
      console.warn(
        `[reveal] constraint violation (${reason})${i === 0 ? ', retrying with correction' : ', serving fallback'}`,
      );
      correction = reason;
    } catch (err) {
      const why = err.name === 'TimeoutError' ? `timed out after ${TIMEOUT_MS}ms` : err.message;
      console.warn('[reveal] generation failed, serving fallback:', why);
      return fallbackCopy(vars);
    }
  }
  return fallbackCopy(vars);
}

export const cacheStats = () => ({ variants: cache.size });
