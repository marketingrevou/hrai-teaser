// Static fallback copy for the two LLM-generated result blocks.
//
// Per spec §4: if the model call fails, times out, or violates a length cap,
// serve these. Never show an empty block, never show an error.
// These are also what runs when no OPENROUTER_API_KEY is configured.

const GAP_BY_ROLE_TYPE = {
  spec: 'Kamu punya kedalaman di satu fungsi, dan itu modal yang tidak semua orang punya. Yang diminta di level berikutnya biasanya cakupan, karena keputusan soal orang jarang berhenti di satu fungsi saja.',
  gen: 'Kamu sudah biasa melihat HR sebagai satu kesatuan, bukan potongan-potongan terpisah. Yang diminta di level berikutnya biasanya kedalaman, sampai ke angka yang bisa kamu pertahankan di depan direksi.',
  new: 'Kamu masuk tanpa kebiasaan lama yang harus dibongkar dulu, dan itu keuntungan. Yang perlu dibangun sekarang adalah cara melihat HR sebagai satu sistem yang saling terkait.',
};

const GAP_BY_ALTITUDE = {
  1: 'Ruang berikutnya ada di masuk lebih awal, saat arahnya masih dibentuk.',
  2: 'Ruang berikutnya ada di masuk lebih awal, saat arahnya masih dibentuk.',
  3: 'Ruang berikutnya ada di pindah dari menyusun opsi ke menentukan arah.',
  4: 'Aksesnya sudah bukan hambatan. Yang membedakan sekarang kedalaman jawabannya.',
};

const AI_BY_LEVEL = {
  1: 'Ada pekerjaan HR yang dulu terlalu lambat untuk dimulai, dan sekarang bisa dikerjakan. Pekerjaan itu yang biasanya menaikkan posisi seseorang.',
  2: 'Menulis adalah pemakaian paling kecil dari AI. Yang mengubah posisi adalah analisis yang dulu perlu konsultan untuk mengerjakannya.',
  3: 'Batas berikutnya adalah membangun tools yang dipakai tim kamu sendiri, tanpa menunggu IT. Di titik itu HR berhenti jadi pengguna dan mulai jadi perancang.',
  4: 'Kombinasi yang jarang adalah melakukan itu sambil memegang keputusan di seluruh fungsi HR. Jaraknya bukan lagi soal tools.',
};

export function fallbackCopy({ role_type, altitude, ai_level }) {
  const rt = GAP_BY_ROLE_TYPE[role_type] ? role_type : 'gen';
  const alt = GAP_BY_ALTITUDE[altitude] ? altitude : 2;
  const ai = AI_BY_LEVEL[ai_level] ? ai_level : 1;

  return {
    gap_body: `${GAP_BY_ROLE_TYPE[rt]} ${GAP_BY_ALTITUDE[alt]}`,
    ai_body: AI_BY_LEVEL[ai],
    source: 'fallback',
  };
}
