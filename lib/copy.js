// Static fallback copy for the two LLM-generated result blocks.
//
// Per spec §4: if the model call fails, times out, or violates a length cap,
// serve these. Never show an empty block, never show an error.
// These are also what runs when no OPENROUTER_API_KEY is configured.

// Three bullets, not a paragraph: the gap block answers three separate questions
// (what you have, what the next level asks, where your room is), and a reader
// scanning one screen finds three of those faster than a block of prose. Each
// line stays under fifteen plain words and can be read on its own.

const HAVE_BY_ROLE_TYPE = {
  spec: 'Kamu paham satu fungsi HR sampai ke angkanya.',
  gen: 'Kamu sudah biasa melihat HR sebagai satu kesatuan, bukan potongan terpisah.',
  new: 'Kamu masuk tanpa kebiasaan lama yang harus dibongkar dulu.',
};

const NEXT_BY_ROLE_TYPE = {
  spec: 'Level berikutnya minta kamu baca fungsi lain juga: rekrutmen, performa, struktur gaji.',
  gen: 'Level berikutnya minta angka yang bisa kamu pertahankan di depan direksi.',
  new: 'Level berikutnya minta kamu lihat rekrutmen, performa, dan gaji sebagai satu sistem.',
};

const ROOM_BY_ALTITUDE = {
  1: 'Ruang kamu ada di masuk lebih awal, saat arahnya masih dibentuk.',
  2: 'Ruang kamu ada di masuk lebih awal, saat arahnya masih dibentuk.',
  3: 'Ruang kamu ada di ikut menentukan arah, bukan menyiapkan pilihannya.',
  // Says "isi jawaban" rather than reaching for "kedalaman" again, which the spec
  // leg has already spent one bullet earlier (TONE.md R6).
  4: 'Kamu sudah duduk di ruang keputusan, jadi isi jawaban kamu yang membedakan.',
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
    gap_points: [HAVE_BY_ROLE_TYPE[rt], NEXT_BY_ROLE_TYPE[rt], ROOM_BY_ALTITUDE[alt]],
    ai_body: AI_BY_LEVEL[ai],
    source: 'fallback',
  };
}
