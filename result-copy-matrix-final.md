# Result Copy Matrix — replaces LLM generation

**Supersedes section 4 of `strategic-hr-teaser-spec.md`.**

The result screen no longer generates copy at request time. All strings are static and selected by lookup. Six variants for the gap block, four for the AI block.

---

## Why static

Three variables (role type, decision-chain position, aspiration) fused into two sentences produced connective filler, because the model had to invent a bridge between inputs that do not naturally join. Two variables and hand-written strings remove the problem entirely, and six variants is small enough to read end to end before launch.

---

## Selection logic

```
gap_body = LOOKUP(role_type, aspiration)
ai_body  = LOOKUP(ai_level)
```

**Variables:**

| Variable | Values |
|---|---|
| `role_type` | `gen` \| `spec` \| `new` |
| `role_fn` | rekrutmen \| L&D \| compensation \| HR operations (spec roles only) |
| `aspiration` | `head` \| `hrbp` \| `breadth` |
| `ai_level` | `1` \| `2` \| `3` \| `4` |

`{fn}` in the spec strings is replaced with `role_fn`. `{to}` is replaced with the aspiration destination: "Head of HR" or "HR Business Partner". The `head` and `hrbp` aspirations share one string per role type; only the destination name changes.

---

## Block B — "Untuk sampai ke sana"

Heading is fixed. Body per cell below.

### role_type = `gen`
*(HR Generalist, HR Business Partner, HR Manager / Head of HR, "Bukan HR tapi saya yang pegang urusan orang")*

**→ `head`, `hrbp`**
> Kamu sudah menyentuh hampir semua fungsi HR. Untuk mencapai {to}, kamu perlu beralih dari eksekusi ke strategi, bisa menjelaskan kenapa sebuah keputusan diambil. Kamu juga perlu menguasai framework yang tepat di semua fungsi HR, dari L&D, organization development, sampai compensation.

**→ `breadth` (Menguasai seluruh fungsi dengan framework)**
> Kamu sudah menyentuh hampir semua fungsi HR. Yang belum biasanya framework-nya: kamu tahu cara mengerjakannya, tapi tiap keputusan masih dimulai dari nol. Framework yang tepat membuat keputusan kamu konsisten di semua fungsi.

---

### role_type = `spec`
*(Talent Acquisition, Learning & Development, Compensation & Benefits, HR Operations)*

**→ `head`, `hrbp`**
> Kedalaman kamu di {fn} sudah jadi pijakan yang solid. Untuk mencapai {to}, kamu perlu beralih dari eksekusi ke strategi, bisa menjelaskan kenapa sebuah keputusan diambil. Kamu juga perlu menguasai framework yang tepat di semua fungsi HR, bukan hanya di {fn}.

**→ `breadth` (Menguasai seluruh fungsi dengan framework)**
> Kedalaman kamu di {fn} sudah jadi pijakan yang solid. Yang belum: lima fungsi HR lain, dan framework untuk mengambil keputusan di masing-masing.

---

### role_type = `new`
*(Baru memulai karier di HR)*

**→ `head`, `hrbp`**
> Di awal karier, yang paling menentukan adalah framework yang tepat di semua fungsi HR. Itu fondasi yang membuat langkah kamu ke {to} lebih terarah.

**→ `breadth`**
> Di awal karier, yang paling menentukan adalah framework yang tepat di semua fungsi HR. Itu fondasi untuk benar-benar menguasai seluruh fungsi, bukan sekadar pernah menyentuhnya.

---

## Block C — "Tentang AI"

Selected by `ai_level` only. Independent of role and aspiration.

The ladder follows what the program teaches: **output → keputusan → sistem.** Each string acknowledges where they are, then names concrete AI work available above them. All examples are lifted from the program page; do not invent new ones.

**Level 1 — Belum saya pakai untuk pekerjaan HR**
> AI belum masuk ke cara kamu bekerja. Banyak peluang untuk menggunakan AI di pekerjaan HR, seperti: menguji kasus headcount sebelum dibawa ke meeting, membangun sendiri agent penilaian kinerja, atau menyusun workflow hiring yang menyamakan cara menilai kandidat antar interviewer.

**Level 2 — Untuk menyusun draf: JD, email, kebijakan**
> AI baru kamu pakai untuk menyusun draf. Banyak peluang lain di pekerjaan HR, seperti: menguji kasus headcount sebelum dibawa ke meeting, membangun sendiri agent penilaian kinerja, atau menyusun workflow hiring yang menyamakan cara menilai kandidat antar interviewer.

**Level 3 — Untuk menguji keputusan: logika, skenario, analisis data**
> Kamu sudah memakai AI untuk menguji keputusan. Peluang berikutnya membangun sendiri tools-nya, seperti: agent penilaian kinerja, atau workflow hiring yang menyamakan cara menilai kandidat antar interviewer, tanpa menunggu tim IT.

**Level 4 — Untuk membangun agent atau workflow yang dipakai tim**
> Kamu sudah membangun sendiri tools yang dipakai tim. Itu jarang di HR. Yang lebih jarang lagi adalah bisa melakukan itu sekaligus memegang keputusan di seluruh fungsi HR.

---

## Voice rules these strings follow

Kept here so future edits stay consistent.

1. **Second person throughout.** Never *praktisi*, *profesional HR*, *individu*, *seseorang*. Never *organisasi* for their employer; use *perusahaan kamu*.
2. **AI is called AI.** Never *teknologi*, *tools digital*, *sistem*, *otomasi*.
3. **Verbs, not noun stacks.** "bisa menjawab soal fungsi yang belum pernah kamu pegang", not "keluasan cakupan di seluruh fungsi HR".
4. **Concrete work, not abstractions.** Desain organisasi, struktur gaji, kalibrasi performa. Not "keputusan berdampak besar".
5. **Sentence one credits what they have.** Never open on a deficiency.
6. **Sentence two frames the gap as what the goal requires**, not as what the person lacks.
7. **No timeframe promises.** No "dalam 15 minggu", no implied role change by a date.
8. **No AI-replaces-headcount framing.** This is an HR audience.
9. **No em dashes.** Commas, periods, colons.
10. **Formal word choice, informal address.** *Tidak* not *nggak*, *membuat* not *bikin*, but always *kamu* and never *Anda*.

---

## What this changes for the build

- Remove the LLM call and its fallback path entirely.
- Two lookup tables, 10 strings.
- The decision-chain question has been removed from the flow entirely. Three questions remain.
- The fourth aspiration option ("Bekerja lebih cepat dan lebih tajam dengan AI") is removed
  with it, leaving three that map 1:1 to `head` / `hrbp` / `breadth`. It had no gap string,
  and Block C already carries the AI angle for every visitor regardless of what they picked.
- The AI question's option labels are the four `ai_level` headings in Block C above, so the
  answer and the paragraph it selects use the same words.
- Result screen now has zero runtime dependencies and cannot fail.

**As built:** the tables live in `public/result-copy.js` and are resolved in the browser.
`npm test` walks all 108 reachable answer paths. Edit the strings in both places, or edit
them there and keep this file in step — this document is the reviewable copy of record.
