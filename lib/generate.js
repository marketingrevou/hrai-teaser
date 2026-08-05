// Generates the two result-screen blocks (gap_body, ai_body) via OpenRouter.
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

import { fallbackCopy } from './copy.js';

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const GAP_WORD_CAP = 55;
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

gap_body — dua sampai tiga kalimat. Maksimum ${GAP_WORD_CAP} kata, keras.
ai_body — dua kalimat. Maksimum ${AI_WORD_CAP} kata, keras.

Judul kedua blok sudah ditetapkan di halaman ("Untuk sampai ke sana" dan "Tentang AI"). Jangan menulis judul, jangan mengulang judul di dalam isi.

# Aturan gap_body

Kalimat satu mengakui apa yang sudah dia punya. Sebut spesifik pakai role_fn atau role_type. Jangan pernah membuka dengan kekurangan.

Kalimat dua menyebut apa yang diminta level berikutnya. Bingkai sebagai tuntutan dari aspirasinya, bukan sebagai kekurangan orangnya. Tulis "yang diminta berikutnya biasanya cakupan", bukan "kamu kurang cakupan".

Kalimat tiga membahas altitude, dan hanya jarak antara levelnya dengan level di atasnya:
- altitude 1 atau 2: masuk lebih awal, saat arah masih dibentuk
- altitude 3: pindah dari menyusun opsi ke menentukan arah
- altitude 4: akses bukan lagi hambatannya, kedalaman jawaban yang membedakan

role_type menentukan kalimat dua:
- spec: dia punya kedalaman, yang diminta berikutnya keluasan
- gen: dia punya keluasan, yang diminta berikutnya kedalaman
- new: posisikan sebagai kebebasan, bukan kekurangan; yang diminta adalah belajar melihat HR sebagai satu sistem

# Aturan ai_body

Bahas ai_level saja. Jangan mengulang apa pun dari gap_body.
- level 1: pekerjaan yang dulu terlalu lambat untuk dikerjakan sekarang mungkin, dan pekerjaan itu yang menaikkan posisi orang
- level 2: menulis adalah pemakaian paling kecil; yang mengubah posisi adalah analisis yang dulu butuh konsultan
- level 3: batas berikutnya adalah membangun tools yang dipakai tim sendiri, tanpa menunggu IT
- level 4: kombinasi yang jarang adalah melakukan itu sambil memegang keputusan di seluruh fungsi HR

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

# Larangan gaya yang sering dilanggar

Jangan pakai "sekadar", "bukan sekadar", "hanya", "bukan hanya", atau "jangan hanya" untuk menggambarkan pekerjaannya sekarang. Konstruksi itu mengecilkan pekerjaan yang dia kerjakan hari ini. Setiap level dalam pertanyaan menggambarkan pekerjaan yang sah dan terhormat. Sebut apa yang diminta level berikutnya tanpa merendahkan apa pun yang dia kerjakan sekarang.

Jangan pakai "kamu harus" atau "kamu perlu". Yang menuntut adalah levelnya, bukan kamu yang memerintah dia. Tulis "yang diminta berikutnya adalah", "tuntutannya adalah".

Jangan buka gap_body dengan "Sebagai [role],". Mulai langsung dengan apa yang dia punya.

Patuhi persis satu aturan altitude dan satu aturan ai_level, yaitu yang cocok dengan angkanya. Jangan menggabungkan dua level sekaligus.

Kata bahasa Inggris yang boleh hanya: job description, workflow, tools, framework, benchmark. Kata seperti leverage, insight, mindset, skill, upskilling, value, impact tidak boleh. Cari padanan Indonesianya.

Sebelum membalas, periksa sendiri: hitung jumlah kata kedua blok, dan pastikan kata "sekadar", "hanya", "kamu harus", dan "kamu perlu" tidak ada sama sekali. Ini pelanggaran yang paling sering terjadi.

Balas hanya dengan JSON sesuai skema. Tanpa penjelasan, tanpa blok kode.`;

const RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: {
    name: 'result_copy',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        gap_body: {
          type: 'string',
          description: `Blok B. Dua sampai tiga kalimat, maksimum ${GAP_WORD_CAP} kata.`,
        },
        ai_body: {
          type: 'string',
          description: `Blok C. Dua kalimat, maksimum ${AI_WORD_CAP} kata.`,
        },
      },
      required: ['gap_body', 'ai_body'],
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

const wordCount = (s) => s.trim().split(/\s+/).filter(Boolean).length;

const VIOLATIONS = [
  [/[—–]/, 'em dash or en dash'],
  [/\bAnda\b/, '"Anda" instead of "kamu"'],
  [/Bapak\s*\/?\s*Ibu/i, '"Bapak/Ibu"'],
  [/\?/, 'question mark'],
  [/\b\d+\s*(minggu|bulan|tahun|hari)\b/i, 'timeframe promise'],
  [/setelah\s+program/i, '"setelah program"'],
  [/\bRp\s*\d|\bjuta\b|\bgaji\b/i, 'salary or figure'],
  [/(gantikan|menggantikan|pengganti)\s+(orang|tim|headcount|karyawan)/i, 'AI-replaces-headcount framing'],
  // "merely / only" diminishes the job the reader does today. Every option in the
  // questionnaire describes a legitimate job (spec §3), so this register is out.
  [/\bsekadar\b|\bsekedar\b/i, '"sekadar" diminishes their current work'],
  // Obligation aimed at the person rather than the level demanding it.
  [/\bkamu\s+(harus|perlu)\b/i, '"kamu harus/perlu" — prescriptive at the reader'],
  // English beyond the loanwords the spec permits.
  // Note: does not ban "operations" or "development" — those appear inside the
  // legitimate role labels "HR Operations" and "Learning & Development".
  [/\b(leverage|insight|insights|mindset|skill|skillset|upskilling|reskilling|value|impact|journey|growth|awareness|capability|operational)\b/i,
    'English word outside the permitted loanword list'],
];

/**
 * Returns null when the copy is clean, otherwise a reason string for the log.
 * Exported so the static fallback copy can be held to the same bar.
 */
export function validate({ gap_body, ai_body }) {
  if (!gap_body?.trim() || !ai_body?.trim()) return 'empty block';

  // Collect every violation, not just the first. A retry told about one rule tends
  // to fix it and break another; naming them all in one go converts far more
  // rejections into passes.
  const found = [];
  if (wordCount(gap_body) > GAP_WORD_CAP) found.push(`gap_body over ${GAP_WORD_CAP} words`);
  if (wordCount(ai_body) > AI_WORD_CAP) found.push(`ai_body over ${AI_WORD_CAP} words`);
  for (const [pattern, label] of VIOLATIONS) {
    if (pattern.test(gap_body)) found.push(`gap_body: ${label}`);
    if (pattern.test(ai_body)) found.push(`ai_body: ${label}`);
  }
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
      gap_body: parsed.gap_body.trim(),
      ai_body: parsed.ai_body.trim(),
      source: 'model',
    },
  };
}

/**
 * @param {{role_label: string, role_type: 'gen'|'spec'|'new', role_fn: string,
 *          altitude: 1|2|3|4, ai_level: 1|2|3|4, aspiration_to: string}} vars
 */
export async function generateResultCopy(vars) {
  const key = cacheKey(vars);
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
