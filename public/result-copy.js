// The result-screen copy. Two lookup tables, ten strings, no generation.
//
// Supersedes section 4 of the spec; the reasoning lives in
// `result-copy-matrix-final.md`. In short: three variables fused into two
// sentences produced connective filler, because the model had to invent a bridge
// between inputs that do not naturally join. Two variables and hand-written
// strings remove the problem, and six variants is small enough to read end to end
// before launch.
//
//   gap_body = GAP[role_type][aspiration is breadth ? 'breadth' : 'goal']
//   ai_body  = AI_BY_LEVEL[ai_level]
//
// `{fn}` is replaced with role_fn, `{to}` with the aspiration destination. The
// `head` and `hrbp` aspirations share one string per role type; only the
// destination name changes.
//
// ---------------------------------------------------------------------------
// Voice rules these strings follow. Kept here so future edits stay consistent.
//
//  1. Second person throughout. Never `praktisi`, `profesional HR`, `individu`,
//     `seseorang`. Never `organisasi` for their employer; use `perusahaan kamu`.
//  2. AI is called AI. Never `teknologi`, `tools digital`, `sistem`, `otomasi`.
//  3. Verbs, not noun stacks. "bisa menjawab soal fungsi yang belum pernah kamu
//     pegang", not "keluasan cakupan di seluruh fungsi HR".
//  4. Concrete work, not abstractions. Desain organisasi, struktur gaji,
//     kalibrasi performa. Not "keputusan berdampak besar".
//  5. Sentence one credits what they have. Never open on a deficiency.
//  6. Sentence two frames the gap as what the goal requires, not as what the
//     person lacks.
//  7. No timeframe promises. No "dalam 15 minggu", no implied role change by a date.
//  8. No AI-replaces-headcount framing. This is an HR audience.
//  9. No em dashes. Commas, periods, colons.
// 10. Formal word choice, informal address. `Tidak` not `nggak`, `membuat` not
//     `bikin`, but always `kamu` and never `Anda`.
// ---------------------------------------------------------------------------

// Block B — "Untuk sampai ke sana". `goal` covers the head and hrbp aspirations,
// which differ only in the destination name that `{to}` carries.
const GAP = {
  // HR Generalist, HR Business Partner, HR Manager / Head of HR, and the person
  // holding people matters without an HR title.
  gen: {
    goal: 'Kamu sudah menyentuh hampir semua fungsi HR. Untuk mencapai {to}, kamu perlu beralih dari eksekusi ke strategi, bisa menjelaskan kenapa sebuah keputusan diambil. Kamu juga perlu menguasai framework yang tepat di semua fungsi HR, dari L&D, organization development, sampai compensation.',
    breadth: 'Kamu sudah menyentuh hampir semua fungsi HR. Yang belum biasanya framework-nya: kamu tahu cara mengerjakannya, tapi tiap keputusan masih dimulai dari nol. Framework yang tepat membuat keputusan kamu konsisten di semua fungsi.',
  },
  // Talent Acquisition, Learning & Development, Compensation & Benefits, HR Operations.
  spec: {
    goal: 'Kedalaman kamu di {fn} sudah jadi pijakan yang solid. Untuk mencapai {to}, kamu perlu beralih dari eksekusi ke strategi, bisa menjelaskan kenapa sebuah keputusan diambil. Kamu juga perlu menguasai framework yang tepat di semua fungsi HR, bukan hanya di {fn}.',
    breadth: 'Kedalaman kamu di {fn} sudah jadi pijakan yang solid. Yang belum: lima fungsi HR lain, dan framework untuk mengambil keputusan di masing-masing.',
  },
  // Baru memulai karier di HR.
  new: {
    goal: 'Di awal karier, yang paling menentukan adalah framework yang tepat di semua fungsi HR. Itu fondasi yang membuat langkah kamu ke {to} lebih terarah.',
    breadth: 'Di awal karier, yang paling menentukan adalah framework yang tepat di semua fungsi HR. Itu fondasi untuk benar-benar menguasai seluruh fungsi, bukan sekadar pernah menyentuhnya.',
  },
};

// Block C — "Bagaimana AI bisa membantumu". Selected by ai_level only, so it is
// independent of role and aspiration.
//
// The ladder follows what the program teaches: output → keputusan → sistem. Each
// string acknowledges where they are, then names concrete AI work available above
// them. All examples are lifted from the program page; do not invent new ones.
const AI_BY_LEVEL = {
  1: 'AI belum masuk ke cara kamu bekerja. Banyak peluang untuk menggunakan AI di pekerjaan HR, seperti: menguji kasus headcount sebelum dibawa ke meeting, membangun sendiri agent penilaian kinerja, atau menyusun workflow hiring yang menyamakan cara menilai kandidat antar interviewer.',
  2: 'AI baru kamu pakai untuk menyusun draf. Banyak peluang lain di pekerjaan HR, seperti: menguji kasus headcount sebelum dibawa ke meeting, membangun sendiri agent penilaian kinerja, atau menyusun workflow hiring yang menyamakan cara menilai kandidat antar interviewer.',
  3: 'Kamu sudah memakai AI untuk menguji keputusan. Peluang berikutnya membangun sendiri tools-nya, seperti: agent penilaian kinerja, atau workflow hiring yang menyamakan cara menilai kandidat antar interviewer, tanpa menunggu tim IT.',
  4: 'Kamu sudah membangun sendiri tools yang dipakai tim. Itu jarang di HR. Yang lebih jarang lagi adalah bisa melakukan itu sekaligus memegang keputusan di seluruh fungsi HR.',
};

/**
 * Both result blocks for one visitor. Pure lookup: no network, no async, and no
 * way to fail — which is the whole point of replacing the generated copy.
 *
 * @param {{role_type: 'gen'|'spec'|'new', role_fn: string, ai_level: 1|2|3|4,
 *          aspiration: 'head'|'hrbp'|'breadth', aspiration_to: string}} vars
 * @returns {{gap_body: string, ai_body: string}}
 */
export function resultCopy({ role_type, role_fn, ai_level, aspiration, aspiration_to }) {
  // Defensive defaults. deriveVariables already refuses anything out of range, so
  // these only catch a caller passing something odd — better a sensible paragraph
  // than an empty block.
  const rt = GAP[role_type] ? role_type : 'gen';
  const leg = aspiration === 'breadth' ? 'breadth' : 'goal';
  const ai = AI_BY_LEVEL[ai_level] ? ai_level : 1;

  // One pass, so a placeholder can never survive into the page.
  const fill = (s) => s.replace(/\{fn\}|\{to\}/g, (m) => (m === '{fn}' ? role_fn : aspiration_to));

  return {
    gap_body: fill(GAP[rt][leg]),
    ai_body: AI_BY_LEVEL[ai],
  };
}
