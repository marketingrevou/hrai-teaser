// The tone rules from TONE.md, in one place: the prompt section the model reads
// and the checks its output has to pass. Keep this file and TONE.md in step —
// TONE.md explains why each rule exists, this file is what enforces it.
//
// Two tiers, and the split matters:
//
// HARD are absence rules. "This word must not appear" has no false positives, so
// a hit is always a real violation and can safely drive the retry-then-fallback
// loop in generate.js.
//
// SOFT are presence and heuristic rules ("must name something concrete"). Those
// need a hand-built vocabulary list, which means good copy using a word nobody
// listed would get rejected and silently replaced by fallback. Too expensive a
// failure for a guess, so SOFT never blocks a response: it annotates the review
// file that scripts/pregen.mjs writes, where a person makes the call.

/** Dropped into SYSTEM_PROMPT. Written in the register it is asking for. */
export const VOICE_PROMPT = `# Suara

Tulis seperti Head of HR yang bicara langsung ke satu orang di depannya. Bukan paragraf dari deck konsultan.

Orangnya yang jadi subjek, bukan kata benda. Tulis "Kamu sudah biasa membaca masalah orang dari sisi bisnisnya", bukan "Pengalaman di bidang itu memberikan keluasan sudut pandang". Kalau kalimatmu dimulai dengan "Pengalaman", "Penggunaan", "Tuntutan", atau "Lompatan", tulis ulang dengan orangnya di depan. Setiap blok wajib memuat kata "kamu" minimal sekali.

Pakai kata kerja, bukan kata benda bentukan. Tulis "pakai", bukan "penggunaan" atau "pemanfaatan". Tulis "menguasai", bukan "penguasaan". Tulis "bisa menganalisis", bukan "kemampuan untuk menganalisis". Tulis "yang membedakan", bukan "yang menjadi pembeda".

Yang menuntut adalah levelnya, dan levelnya harus jadi subjek aktif. Jangan "kamu harus menguasai angka". Jangan juga "tuntutan level berikutnya adalah penguasaan angka". Tulis "Level berikutnya menuntut kamu datang dengan angkanya", atau "Di kursi itu, yang ditanya pertama adalah angkanya".

Sebut satu hal HR yang konkret di setiap blok: desain organisasi, kalibrasi performa, struktur gaji, efisiensi biaya, headcount, turnover, opsi restrukturisasi, rencana rekrutmen, job description, angka di depan direksi. Jangan berhenti di "kedalaman analisis di setiap fungsi", sebut analisis apa.

Kalimat pendek, satu gagasan, maksimum lima belas kata. Sambung dengan "dan", "tapi", "karena", "jadi".

Dilarang: merupakan, melainkan, namun, adapun, oleh karena itu, dengan demikian, keunggulannya, secara mandiri, secara signifikan, hal ini, hal tersebut, teknologi ini (sebut AI saja), kini (pakai sekarang), terjadi ketika.

Dilarang menguatkan dengan kata: sangat, luar biasa, amat, betul-betul, mumpuni. Kalau satu kelebihan butuh kata "sangat", berarti belum kamu jelaskan.

Satu kata benda abstrak (kedalaman, keluasan, cakupan, posisi, tuntutan) hanya boleh sekali per blok. Yang kedua, sebut dengan kata biasa.

Aturan altitude dan ai_level di atas adalah gagasan yang harus kamu sampaikan, bukan kalimat yang harus kamu tiru. Tulis dengan kata-katamu sendiri.`;

/**
 * Absence rules. Each entry is [pattern, label]. A match is always a violation,
 * so these feed the retry loop.
 */
export const HARD = [
  // Written-report connectors. Nobody speaks these across a table.
  [/\bmerupakan\b|\bmelainkan\b|\bnamun\b|\badapun\b/i, 'formal report connector'],
  [/\bkeunggulannya\b|oleh\s+karena\s+itu|dengan\s+demikian/i, 'formal report connector'],
  [/\bkini\b/i, '"kini" — write "sekarang"'],
  // `secara X` turns a verb into a bureaucratic adverbial.
  [/\bsecara\s+(mandiri|signifikan|langsung|optimal|efektif|maksimal|menyeluruh)\b/i, '"secara X" adverb'],
  // Euphemism on a page whose own heading says AI.
  [/\bteknologi\s+ini\b|\bhal\s+(ini|tersebut)\b/i, 'vague reference, name the thing'],
  // An intensifier is a reason the copy failed to give.
  [/\bsangat\b|\bluar\s+biasa\b|\bamat\b|\bmumpuni\b|\bbetul-betul\b/i, 'intensifier standing in for a reason'],
  // Derived nouns where the verb exists. `pengambil keputusan` and `pekerjaan`
  // are people and things, not smothered verbs, so \b keeps them clear.
  [/\b(penggunaan|pemanfaatan|pemakaian|penguasaan|pelaksanaan|peningkatan|penerapan|pencapaian)\b/i,
    'nominalization, use the verb'],
  [/menjadi\s+pembeda/i, '"menjadi pembeda", write "yang membedakan"'],
  // An event with no agent: a promotion that simply occurs to nobody.
  [/terjadi\s+ketika/i, 'agentless "terjadi ketika"'],
];

/** Abstract nouns allowed once per block. The second use has to be plain words. */
const ABSTRACTIONS = ['kedalaman', 'keluasan', 'cakupan', 'posisi', 'tuntutan', 'lompatan'];

// Deliberately generous. Stiffness in the observed failures came from noun stacks,
// not length: "Penggunaan untuk menulis dokumen merupakan pemanfaatan paling dasar
// dari teknologi ini" is eleven words. The prompt asks for fifteen; this only
// catches genuine runaway, so it never rejects a short-but-stiff draft the other
// rules already handle.
const SENTENCE_WORD_CAP = 24;

const words = (s) => s.trim().split(/\s+/).filter(Boolean);
const sentences = (s) => s.split(/[.:]+/).map((t) => t.trim()).filter(Boolean);

/**
 * Every hard violation in one block. Returns an array of labels, empty when clean.
 * Exported separately from validate() so pregen can report per-rule counts.
 */
export function hardViolations(text) {
  const found = [];

  // The worst failure mode and the cheapest to catch: copy about the reader that
  // never mentions the reader. Both screenshot examples failed exactly here.
  if (!/\bkamu\b/i.test(text)) found.push('no "kamu" — the reader is missing');

  for (const [pattern, label] of HARD) {
    if (pattern.test(text)) found.push(label);
  }

  for (const noun of ABSTRACTIONS) {
    const hits = text.match(new RegExp(`\\b${noun}`, 'gi'));
    if (hits && hits.length > 1) found.push(`"${noun}" used ${hits.length}x in one block`);
  }

  const longest = sentences(text).reduce((max, s) => Math.max(max, words(s).length), 0);
  if (longest > SENTENCE_WORD_CAP) found.push(`sentence of ${longest} words`);

  return found;
}

// Concrete HR objects. Sourced from EXIT.body1 and the questionnaire, so this is
// vocabulary the brand already ships rather than words invented here.
const CONCRETE = [
  'desain organisasi', 'kalibrasi', 'performa', 'struktur gaji', 'gaji', 'biaya',
  'headcount', 'turnover', 'restrukturisasi', 'rekrutmen', 'job description',
  'direksi', 'angka', 'data', 'budget', 'kandidat', 'karyawan', 'promosi', 'tools',
];

const ABSTRACT_OPENERS = /^(pengalaman|penggunaan|pemanfaatan|tuntutan|lompatan|kemampuan|peningkatan|hal)\b/i;

/**
 * Heuristic warnings for the review file. Never blocks a response — see the note
 * at the top of this file on why presence rules stay advisory.
 */
export function softWarnings(text) {
  const warnings = [];

  if (!CONCRETE.some((term) => text.toLowerCase().includes(term))) {
    warnings.push('names nothing concrete');
  }
  for (const s of sentences(text)) {
    if (ABSTRACT_OPENERS.test(s)) warnings.push(`abstract subject: "${words(s).slice(0, 4).join(' ')}…"`);
    if (words(s).length > 15) warnings.push(`${words(s).length}-word sentence`);
  }

  return warnings;
}
