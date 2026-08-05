// Single source of truth for the four questions, imported by both the browser
// (for display) and the server (for deriving LLM variables). The client sends
// answer indices only, so no free text ever reaches the model.

export const HERO = {
  eyebrow: 'Program baru RevoU · September 2026',
  headline: 'Program HR pertama yang dibangun untuk',
  headlineHighlight: 'era AI.',
  cta: 'Tes kecocokan kamu',
};

export const QUESTIONS = [
  {
    id: 'role',
    eyebrow: '1 dari 4',
    question: 'Apa role kamu saat ini?',
    subtitle: 'Pilih yang paling mendekati.',
    // `ack` is per question, not per answer: it only marks that the answer
    // landed and moves the chat on. Reading the answer back to the visitor
    // ("Berarti kamu yang pegang gambaran besarnya") made the bot sound like it
    // was grading them, so the interpretation is saved for /hasil.
    ack: 'Oke.',
    options: [
      { label: 'HR Generalist', role_type: 'gen', role_fn: 'seluruh fungsi HR' },
      { label: 'HR Business Partner', role_type: 'gen', role_fn: 'business partnering' },
      { label: 'HR Manager / Head of HR', role_type: 'gen', role_fn: 'seluruh fungsi HR' },
      { label: 'Talent Acquisition', role_type: 'spec', role_fn: 'rekrutmen' },
      { label: 'Learning & Development', role_type: 'spec', role_fn: 'L&D' },
      { label: 'Compensation & Benefits', role_type: 'spec', role_fn: 'compensation' },
      { label: 'HR Operations', role_type: 'spec', role_fn: 'HR operations' },
      { label: 'Baru memulai karier di HR', role_type: 'new', role_fn: 'HR' },
      // Option 9 exists on purpose (spec §3). In smaller companies the person doing
      // HR often has no HR title, and they are a genuine fit with real budget
      // authority. Do not merge options 9 and 10.
      { label: 'Bukan HR, tapi saya yang pegang urusan orang di perusahaan saya', path_label: 'Pegang urusan orang, tanpa titel HR', role_type: 'gen', role_fn: 'seluruh fungsi HR' },
      { label: 'Bukan HR, dan belum pernah mengerjakan pekerjaan HR', role_type: 'exit', role_fn: null, exit: true },
    ],
  },
  {
    id: 'altitude',
    eyebrow: '2 dari 4',
    // Anchored to the last real decision rather than a general habit, which is
    // what the options answer: each one describes a specific place to have stood
    // in a specific change, not a tendency. The examples sit in the subtitle so
    // the bubble stays one question long.
    question: 'Terakhir kali perusahaan mengambil keputusan besar, di tahap mana kamu dilibatkan?',
    subtitle: 'Restrukturisasi, efisiensi biaya, atau perubahan arah bisnis.',
    ack: 'Baik.',
    options: [
      { label: 'Saya ikut menentukan bahwa perubahan itu memang diperlukan', altitude: 4 },
      { label: 'Arahnya sudah ditetapkan, saya diminta menyusun opsi dan dampaknya', altitude: 3 },
      { label: 'Keputusannya sudah final, saya yang merancang cara menjalankannya', altitude: 2 },
      { label: 'Rencananya sudah jadi, saya yang memastikan pelaksanaannya berjalan', altitude: 1 },
    ],
  },
  {
    id: 'ai',
    eyebrow: '3 dari 4',
    question: 'Sejauh mana kamu sudah pakai AI di pekerjaan HR?',
    ack: 'Oke.',
    options: [
      { label: 'Belum saya gunakan untuk pekerjaan HR', ai_level: 1 },
      { label: 'Untuk menulis: job description, email, draf kebijakan', ai_level: 2 },
      { label: 'Untuk menganalisis data atau menyusun skenario', ai_level: 3 },
      { label: 'Saya membangun sendiri tools atau workflow yang dipakai tim', ai_level: 4 },
    ],
  },
  {
    id: 'aspiration',
    eyebrow: '4 dari 4',
    question: 'Apa yang mau kamu capai berikutnya?',
    options: [
      { label: 'Naik ke posisi HR Leadership seperti Head of HR', aspiration_to: 'Head of HR' },
      { label: 'Pindah ke peran yang lebih strategis, seperti HR Business Partner', aspiration_to: 'HR Business Partner' },
      { label: 'Menguasai seluruh fungsi HR dengan framework yang tepat', aspiration_to: 'Strategic HR generalist' },
      { label: 'Bekerja lebih cepat dan lebih tajam dengan AI', aspiration_to: 'AI-fluent HR professional' },
    ],
  },
];

// The closing beat of the chat. Says nothing about the result on purpose: the
// point of the handoff is that the payoff is worth opening, not that it has
// already been given away.
export const HANDOFF = {
  lines: [
    'Jawaban kamu sudah cukup.',
    // The chat drops its "saya" here and hands over to the loader, which is
    // where the waiting actually happens. "Menyiapkan hasilnya", not
    // "Menyiapkan jawaban": "jawaban" means the visitor's four answers
    // everywhere else in the flow, including the loader headline on the next
    // screen, and it should not switch to meaning the reply mid-handoff.
    'Menyiapkan hasilnya.',
  ],
};

// The reveal page (/hasil). `steps` never names the program: the name is the
// payoff and must not leak into the loading scene.
//
// The path-and-distance vocabulary this scene used to run on ("saya susun
// jalurnya", "mengukur jarak ke yang kamu kejar") is out: menyusun does not
// collocate with jalur, and measuring a distance is physical where career
// language is not. The steps now name the three things the result actually
// shows, so the scene claims no work it is not doing.
export const REVEAL = {
  loadingHeadline: 'Jawaban kamu sedang diolah.',
  // One step per thing actually read, in the order the questions asked it.
  // "Posisi kamu sekarang" and "Peran kamu sekarang" side by side read as the
  // same item twice, so the second names what it really carries: the stage the
  // visitor gets brought in at, in the words Q2 uses.
  steps: [
    'Peran kamu sekarang',
    'Tahap kamu dilibatkan',
    'Yang diperlukan untuk mencapai tujuan kamu',
  ],
  advance: 'Ketuk untuk lanjut',
  restart: 'Ulangi dari awal',
};

export const RESULT = {
  // Both legs of the path are a posisi, so the two labels are parallel: one
  // saat ini, one tujuan. Set uppercase by CSS, hence sentence case here.
  pathNowLabel: 'Posisi kamu saat ini',
  pathTargetLabel: 'Posisi tujuan kamu',
  // Trimmed to a phrase so it does not restate the loader's last step, which
  // one tap earlier promised "Yang diperlukan untuk mencapai tujuan kamu". Kept
  // clear of "yang diminta di level berikutnya" too: that is how the generated
  // and fallback bodies under this heading open.
  gapHeading: 'Untuk sampai ke sana',
  aiHeading: 'Tentang AI',
  bridge: 'Ini program yang dibangun untuk lompatan itu.',
  // The final scene of the reveal, one screen and nothing after it. The curriculum
  // detail that used to sit below the fold here is the Open House's job to sell,
  // so the scene ends on the CTA instead of arguing past it. `headline` is set
  // uppercase by CSS, so it is stored in sentence case and stays readable to
  // screen readers.
  card: {
    pill: 'Strategic HR with AI · 15 weeks · Online',
    headline: 'The first HR program built for',
    headlineHighlight: 'the AI era.',
    sub: 'A 15-week program that takes HR professionals from execution to strategy, with AI built into how you work.',
    name: 'Strategic HR with AI',
    cta: 'Daftar Open House',
    ctaHref: 'https://openhouse.revou.co/human-capital?utm_ops=teaser',
  },
};

export const EXIT = {
  heading: 'Program ini butuh dasar HR.',
  body1:
    'Strategic HR with AI dibangun untuk orang yang sudah mengerjakan HR. Materinya langsung masuk ke keputusan: desain organisasi, kalibrasi performa, struktur gaji, efisiensi biaya. Tanpa pernah ada di situasinya, sebagian besar akan terasa mengambang.',
  body2: 'Kami lebih baik bilang sekarang daripada kamu menyadarinya di minggu ketiga.',
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
