// Single source of truth for the four questions, imported by both the browser
// (for display) and the server (for deriving LLM variables). The client sends
// answer indices only, so no free text ever reaches the model.

export const HERO = {
  eyebrow: 'Program baru RevoU · September 2026',
  headline: 'Program HR pertama yang dibangun untuk',
  headlineHighlight: 'era AI.',
  body: 'Program ini dibangun untuk level tertentu. Jawab empat pertanyaan singkat untuk cek apakah ini cocok untukmu.',
  cta: 'Explore more',
};

export const QUESTIONS = [
  {
    id: 'role',
    eyebrow: '1 dari 4',
    question: 'Apa role kamu saat ini?',
    subtitle: 'Pilih yang paling mendekati.',
    options: [
      { label: 'HR Generalist', role_type: 'gen', role_fn: 'seluruh fungsi HR', ack: 'Oke. Berarti kamu yang pegang gambaran besarnya.' },
      { label: 'HR Business Partner', role_type: 'gen', role_fn: 'business partnering', ack: 'Oke. Kamu duduk paling dekat dengan bisnisnya.' },
      { label: 'HR Manager / Head of HR', role_type: 'gen', role_fn: 'seluruh fungsi HR', ack: 'Oke. Berarti keputusannya berhenti di kamu.' },
      { label: 'Talent Acquisition', role_type: 'spec', role_fn: 'rekrutmen', ack: 'Oke, rekrutmen. Kamu yang paling sering lihat pasarnya langsung.' },
      { label: 'Learning & Development', role_type: 'spec', role_fn: 'L&D', ack: 'Oke, L&D. Kamu kerja di bagian yang hasilnya paling lambat kelihatan.' },
      { label: 'Compensation & Benefits', role_type: 'spec', role_fn: 'compensation', ack: 'Oke, compensation. Bagian HR yang paling dekat dengan angka.' },
      { label: 'HR Operations', role_type: 'spec', role_fn: 'HR operations', ack: 'Oke, HR operations. Kalau ini berhenti, semuanya berhenti.' },
      { label: 'Baru memulai karier di HR', role_type: 'new', role_fn: 'HR', ack: 'Oke. Waktu yang bagus untuk masuk, sebenarnya.' },
      // Option 9 exists on purpose (spec §3). In smaller companies the person doing
      // HR often has no HR title, and they are a genuine fit with real budget
      // authority. Do not merge options 9 and 10.
      { label: 'Bukan HR, tapi saya yang pegang urusan orang di perusahaan saya', path_label: 'Pegang urusan orang, tanpa titel HR', role_type: 'gen', role_fn: 'seluruh fungsi HR', ack: 'Oke. Tanpa titel HR, tapi pekerjaannya sama.' },
      { label: 'Bukan HR, dan belum pernah mengerjakan pekerjaan HR', role_type: 'exit', role_fn: null, exit: true },
    ],
  },
  {
    id: 'altitude',
    eyebrow: '2 dari 4',
    question:
      'Ingat perubahan besar terakhir di perusahaan kamu. Restrukturisasi, efisiensi biaya, atau perubahan arah bisnis. Di titik mana kamu masuk?',
    options: [
      { label: 'Saya ikut menentukan bahwa perubahan itu memang diperlukan', altitude: 4, ack: 'Berarti kamu ada di ruangan waktu keputusannya masih terbuka.' },
      { label: 'Arahnya sudah ditetapkan, saya diminta menyusun opsi dan dampaknya', altitude: 3, ack: 'Menyusun opsi dan dampaknya. Itu bagian yang paling berat.' },
      { label: 'Keputusannya sudah final, saya yang merancang cara menjalankannya', altitude: 2, ack: 'Merancang cara menjalankannya. Di situ rencana ketemu kenyataan.' },
      { label: 'Rencananya sudah jadi, saya yang memastikan pelaksanaannya berjalan', altitude: 1, ack: 'Memastikan pelaksanaannya jalan. Tanpa itu, rencana cuma dokumen.' },
    ],
  },
  {
    id: 'ai',
    eyebrow: '3 dari 4',
    question: 'Sejauh mana AI sudah masuk ke pekerjaan HR kamu?',
    options: [
      { label: 'Belum saya gunakan untuk pekerjaan HR', ai_level: 1, ack: 'Jujur. Itu masih posisi mayoritas orang HR di Indonesia.' },
      { label: 'Untuk menulis: job description, email, draf kebijakan', ai_level: 2, ack: 'Sudah masuk ke pekerjaan harian. Itu pintu masuknya.' },
      { label: 'Untuk menganalisis data atau menyusun skenario', ai_level: 3, ack: 'Analisis dan skenario. Kamu sudah lewat tahap menulis.' },
      { label: 'Saya membangun sendiri tools atau workflow yang dipakai tim', ai_level: 4, ack: 'Kamu membangun, bukan cuma memakai. Itu jarang.' },
    ],
  },
  {
    id: 'aspiration',
    eyebrow: '4 dari 4',
    question: 'Apa yang kamu kejar berikutnya?',
    options: [
      { label: 'Naik ke posisi HR Leadership seperti Head of HR', aspiration_to: 'Head of HR' },
      { label: 'Pindah ke peran yang lebih strategis, seperti HR Business Partner', aspiration_to: 'HR Business Partner' },
      { label: 'Menguasai seluruh fungsi HR dengan framework yang tepat', aspiration_to: 'Strategic HR generalist' },
      { label: 'Bekerja lebih cepat dan lebih tajam dengan AI', aspiration_to: 'AI-fluent HR professional' },
    ],
  },
];

export const RESULT = {
  intro: 'Sebentar, saya susun jalurnya.',
  pathNowLabel: 'Posisi kamu saat ini',
  pathTargetLabel: 'Yang kamu kejar',
  gapHeading: 'Yang dibutuhkan untuk sampai ke sana',
  aiHeading: 'Tentang AI',
  bridge: 'Ini program yang dibangun untuk lompatan itu.',
  card: {
    name: 'Strategic HR with AI',
    meta: '15 WEEKS · ONLINE · STARTS SEPTEMBER 2026',
    bullets: [
      'Every part of the HR function, taught end to end',
      "Taught by HR leaders from Indonesia's top companies",
      'AI is how you work, from day one',
      'AI agents and workflows you built, plus 7 portfolio projects',
    ],
    cta: 'Daftar Open House',
    ctaHref: 'https://openhouse.revou.co/human-capital?utm_ops=teaser',
  },
};

export const EXIT = {
  heading: 'Program ini butuh dasar HR.',
  body1:
    'Strategic HR with AI dibangun untuk orang yang sudah mengerjakan HR. Materinya langsung masuk ke keputusan: desain organisasi, kalibrasi performa, struktur gaji, efisiensi biaya. Tanpa pernah ada di situasinya, sebagian besar akan terasa mengambang.',
  body2: 'Kami lebih baik bilang ini sekarang daripada kamu tahu di minggu ketiga.',
  dividerHeading: 'RevoU punya program lain yang mungkin lebih cocok.',
  cta: 'Lihat program lain',
  // TODO(spec §6): destination undecided. If one program is most often the right
  // next-best fit for this group, link it directly instead of the catalogue.
  ctaHref: '#program-lain',
};

/**
 * Turns four answer indices into the variables the model receives.
 * Returns null if any index is out of range.
 */
export function deriveVariables([q1, q2, q3, q4]) {
  const role = QUESTIONS[0].options[q1];
  const altitude = QUESTIONS[1].options[q2];
  const ai = QUESTIONS[2].options[q3];
  const aspiration = QUESTIONS[3].options[q4];
  if (!role || !altitude || !ai || !aspiration || role.exit) return null;

  return {
    role_label: role.path_label ?? role.label,
    role_type: role.role_type,
    role_fn: role.role_fn,
    altitude: altitude.altitude,
    ai_level: ai.ai_level,
    aspiration_to: aspiration.aspiration_to,
  };
}
