// Static fallback copy for the two LLM-generated result blocks.
//
// Per spec §4: if the model call fails, times out, or violates a length cap,
// serve these. Never show an empty block, never show an error.
// These are also what runs when no OPENROUTER_API_KEY is configured.

// Two bullets, not a paragraph: the gap block answers what you have and what the
// next level asks, and a reader scanning one screen finds two of those faster than
// a block of prose. Each line stays under fifteen plain words and can be read on
// its own.
//
// The second bullet is composed rather than looked up, because it carries two
// variables at once — role_type decides what is being asked, altitude decides where
// the room is. Seven fragments cover twelve combinations, and keeping them this
// short is what holds the joined sentence inside GAP_POINT_WORD_CAP; the longest
// pairing lands on exactly fourteen words.

const HAVE_BY_ROLE_TYPE = {
  spec: 'Kamu paham satu fungsi HR sampai ke angkanya.',
  gen: 'Kamu sudah biasa melihat HR sebagai satu kesatuan, bukan potongan terpisah.',
  new: 'Kamu masuk tanpa kebiasaan lama yang harus dibongkar dulu.',
};

const ASK_BY_ROLE_TYPE = {
  spec: 'cakupan ke fungsi lain',
  gen: 'angka yang bisa kamu pertahankan',
  new: 'kamu baca HR sebagai sistem',
};

// Deliberately avoids "cuma" and "hanya" here: every one of these tails could be
// written as "bukan cuma menyiapkan pilihan", which is exactly the diminishing of
// today's work the prompt's own style ban exists to stop.
const ROOM_BY_ALTITUDE = {
  1: 'sejak arahnya masih dibentuk',
  2: 'sejak arahnya masih dibentuk',
  3: 'dan kamu yang ikut menentukan arahnya',
  // Says "kursinya sudah kamu punya" rather than reaching for "kedalaman" again,
  // which the spec leg has already spent one bullet earlier (TONE.md R6).
  4: 'karena kursinya sudah kamu punya',
};

// Every block names the reader (TONE.md R1). Levels 1, 2 and 4 used to talk about
// "seseorang" and "posisi" in the abstract, which is the failure the guideline
// exists to stop — the fallback should not be the one example in the repo
// breaking its own rule.
const AI_BY_LEVEL = {
  1: 'Ada pekerjaan HR yang dulu terlalu lambat untuk kamu mulai, dan sekarang bisa jalan. Pekerjaan itu yang biasanya menaikkan posisi orang.',
  2: 'Menulis adalah bagian paling kecil dari AI. Yang mengubah posisi kamu adalah analisis yang dulu perlu konsultan untuk mengerjakannya.',
  3: 'Batas berikutnya adalah membangun tools yang dipakai tim kamu sendiri, tanpa menunggu IT. Di titik itu HR berhenti jadi pengguna dan mulai jadi perancang.',
  4: 'Yang jarang adalah kamu melakukan itu sambil memegang keputusan di seluruh fungsi HR. Jaraknya bukan lagi soal tools.',
};

export function fallbackCopy({ role_type, altitude, ai_level }) {
  const rt = HAVE_BY_ROLE_TYPE[role_type] ? role_type : 'gen';
  const alt = ROOM_BY_ALTITUDE[altitude] ? altitude : 2;
  const ai = AI_BY_LEVEL[ai_level] ? ai_level : 1;

  return {
    gap_points: [
      HAVE_BY_ROLE_TYPE[rt],
      `Level berikutnya minta ${ASK_BY_ROLE_TYPE[rt]}, ${ROOM_BY_ALTITUDE[alt]}.`,
    ],
    ai_body: AI_BY_LEVEL[ai],
    source: 'fallback',
  };
}
