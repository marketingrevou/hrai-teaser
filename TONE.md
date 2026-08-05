# Tone guideline — generated reveal copy

Applies to the two model-written blocks on `/hasil`: `gap_body` ("Untuk sampai ke sana")
and `ai_body` ("Tentang AI"). Written for whoever edits `SYSTEM_PROMPT` in
`lib/generate.js`. §7 is prompt-ready Indonesian; §8 is enforceable.

The benchmark is not an abstraction. The static fallback in `lib/copy.js` is already
in the target register, and the model is currently writing *below* it:

| | |
|---|---|
| **Fallback** (target) | "Menulis adalah pemakaian paling kecil dari AI. Yang mengubah posisi adalah analisis yang dulu perlu konsultan untuk mengerjakannya." |
| **Generated** (current) | "Penggunaan untuk menulis dokumen merupakan pemanfaatan paling dasar dari teknologi ini. Lompatan posisi terjadi ketika analisis yang dulu membutuhkan konsultan kini bisa diselesaikan secara mandiri." |

Same idea, 21 words vs 28, and the second one has no human being in it. If a draft
reads worse than the fallback, we are paying tokens to make the page stiffer.

---

## 1. The one test

> Could a Head of HR say this out loud, to one person, across a table?

Everything below is a consequence of that. The blocks are a person's read on your
career, not a paragraph from a consultant's deck. Right now they read like a deck.

---

## 2. What is actually wrong with the two examples

**`ai_body`** — "Penggunaan untuk menulis dokumen merupakan pemanfaatan paling dasar
dari teknologi ini. Lompatan posisi terjadi ketika analisis yang dulu membutuhkan
konsultan kini bisa diselesaikan secara mandiri."

- `Penggunaan … merupakan pemanfaatan` — two nominalizations bridged by a report-register
  copula. Three words doing the work of one verb: *pakai*.
- `teknologi ini` — a euphemism for AI on a page whose heading is literally "Tentang AI".
- `Lompatan posisi terjadi ketika…` — an event with no agent. Nobody in this sentence does
  anything; a promotion simply *occurs*.
- `bisa diselesaikan secara mandiri` — passive plus a `secara`-adverb. The reader is not
  even the one doing it.
- **No `kamu` anywhere.** The reader has been deleted from their own result.

**`gap_body`** — "Pengalaman di bidang business partnering memberikan keluasan sudut
pandang yang sangat kuat. Tuntutan untuk posisi Head of HR berikutnya adalah kedalaman
analisis di setiap fungsi. Keunggulannya, akses ke pengambil keputusan bukan lagi
hambatan, melainkan kedalaman jawaban yang kini menjadi pembeda."

- `Pengalaman … memberikan …` — an abstract noun is the subject. It is the reader who
  has the experience; say so.
- `yang sangat kuat` — an intensifier standing in for a reason. Flattery, not observation.
- `kedalaman analisis di setiap fungsi` — a four-noun stack. Depth of what, in which
  function, judged by whom. Unfalsifiable, therefore unmemorable.
- `Keunggulannya,` / `melainkan` / `kini menjadi pembeda` — written-report connectors.
  Nobody speaks these.
- `kedalaman` twice, `posisi` twice in 44 words.
- `posisi Head of HR berikutnya` — a misparse of `aspiration_to`. Reads as "the next
  Head of HR role," which is not what the visitor answered.

Pattern: every time the copy has nothing concrete to say, it reaches for a longer noun.

---

## 3. Six rules

### R1 — `kamu` is the subject, at least once per block

Abstractions cannot be the actor. If the sentence's subject is `pengalaman`,
`penggunaan`, `tuntutan`, or `lompatan`, rewrite it with the person in front.

- ✗ `Pengalaman di bidang business partnering memberikan keluasan sudut pandang.`
- ✓ `Kamu sudah biasa membaca satu masalah orang dari sisi bisnisnya.`

### R2 — verbs, not `pe-…-an` nouns

Indonesian will happily let you stack derived nouns forever. Don't. If a noun has a
verb inside it, use the verb.

| ✗ | ✓ |
|---|---|
| penggunaan, pemanfaatan | pakai, memakai |
| penguasaan | menguasai |
| kemampuan untuk menganalisis | bisa menganalisis |
| pelaksanaan | menjalankan |
| yang menjadi pembeda | yang membedakan, bedanya |
| keluasan sudut pandang | terbiasa melihat dari banyak sisi |

### R3 — the demand has an active subject, and it is not `kamu`

This is the important one, and the current prompt causes the failure. `kamu harus` is
banned (correctly: we are not ordering anyone around), so the model escapes into
abstraction. There is a third option — make **the level** the actor:

- ✗ prescriptive: `Kamu harus menguasai analisis biaya.`
- ✗ nominal (current behaviour): `Tuntutan level berikutnya adalah penguasaan analisis biaya.`
- ✓ `Level berikutnya menuntut kamu datang dengan angkanya.`
- ✓ `Di kursi Head of HR, yang ditanya pertama adalah angkanya.`

The level demands. The room asks. The job expects. All active, none of it accusing
the reader of a shortfall.

### R4 — one nameable HR object per block

Every abstract claim has to land on something a practitioner could point at. There is
already brand-approved vocabulary in `EXIT.body1`: **desain organisasi, kalibrasi
performa, struktur gaji, efisiensi biaya** — plus headcount, turnover, opsi
restrukturisasi, rencana rekrutmen, job description, direksi.

- ✗ `kedalaman analisis di setiap fungsi`
- ✓ `angka di balik jawaban itu, dari struktur gaji sampai desain organisasi`

### R5 — short sentences, spoken connectors

One idea per sentence, roughly 15 words or fewer. Join with `dan`, `tapi`, `karena`,
`jadi`. Never `melainkan`, `namun`, `adapun`, `oleh karena itu`, `dengan demikian`,
`Keunggulannya`, `Adapun`. Drop `merupakan`; `adalah` or nothing will do.

### R6 — no intensifiers, no repeated abstractions

Cut `sangat`, `sekali`, `luar biasa`, `amat`, `betul-betul`, `mumpuni`, `solid`. A
strength that needs `sangat` in front of it has not been described yet. And use each
abstract noun (`kedalaman`, `keluasan`, `posisi`, `tuntutan`) **once per block** — the
second time, say it in plain words.

---

## 4. The two examples, rewritten

**`ai_body`** (ai_level 2, ≤45 words) — 32 words:

> Pakai AI untuk menulis job description itu bagian paling kecilnya. Yang mengubah
> posisi kamu adalah saat kamu bisa menghitung sendiri dampak biaya dari satu opsi
> restrukturisasi, pekerjaan yang dulu dibawa ke konsultan.

**`gap_body`** (gen · business partnering · altitude 4 · → Head of HR, ≤55 words) — 52 words:

> Kamu sudah biasa membaca satu masalah orang dari sisi bisnisnya, dan itu alasan
> business partner dipanggil lebih awal. Head of HR menuntut satu hal lagi: angka di
> balik jawaban itu, dari struktur gaji sampai desain organisasi. Akses ke ruang
> keputusan sudah kamu punya, jadi pembedanya sekarang seberapa dalam jawaban yang
> kamu bawa.

Same three beats, same constraints, same hard rules. Shorter, and a person is in it.

---

## 5. Why the prompt produces the stiff version

Two structural causes, worth fixing at the same time as adding §7.

**The prompt is written in the register it is trying to prevent.** Lines like
`Bingkai sebagai tuntutan dari aspirasinya` and `Tulis "yang diminta berikutnya adalah",
"tuntutannya adalah"` (`lib/generate.js:47`, `:83`) hand the model nominal templates and
tell it to use them. The model is obeying. Rewrite those instructions in the target
voice — the prompt's own prose is the strongest style example in the context window.

**The altitude and ai_level bullets are being copied, not paraphrased.** Compare
`lib/generate.js:52` — `akses bukan lagi hambatannya, kedalaman jawaban yang membedakan`
— with the generated sentence three. It is near-verbatim. Those bullets are meant as
the *idea* to express; they are landing as the *wording*. State that explicitly, and
give each bullet in speakable form so a lazy copy still reads well.

---

## 6. Self-check for the model

Add to the existing check at `lib/generate.js:91`. Before answering, verify:

1. `kamu` appears at least once in each block.
2. No sentence's subject is an abstract noun.
3. No `pe-…-an` noun where a verb exists.
4. Each block names at least one concrete HR object.
5. No `merupakan`, `melainkan`, `namun`, `adapun`, `secara mandiri`, `teknologi ini`,
   `hal ini`, `sangat`.
6. No abstract noun repeated inside one block.
7. The altitude and ai_level ideas are in your own words, not the prompt's.

---

## 7. Prompt-ready block (Indonesian)

Drop this into `SYSTEM_PROMPT`, replacing the `# Larangan gaya yang sering dilanggar`
section rather than sitting alongside it.

```
# Suara

Tulis seperti Head of HR yang bicara langsung ke satu orang di depannya. Bukan
paragraf dari deck konsultan.

Kamu harus jadi subjeknya. Tulis "Kamu sudah biasa membaca masalah orang dari sisi
bisnisnya", bukan "Pengalaman di bidang itu memberikan keluasan sudut pandang".
Kata benda abstrak tidak boleh jadi subjek kalimat. Kalau kalimatmu dimulai dengan
"Pengalaman", "Penggunaan", "Tuntutan", atau "Lompatan", tulis ulang dengan orangnya
di depan. Setiap blok wajib memuat kata "kamu" minimal sekali.

Pakai kata kerja, bukan kata benda bentukan. Tulis "pakai", bukan "penggunaan" atau
"pemanfaatan". Tulis "menguasai", bukan "penguasaan". Tulis "bisa menganalisis", bukan
"kemampuan untuk menganalisis". Tulis "yang membedakan", bukan "yang menjadi pembeda".

Yang menuntut adalah levelnya, dan levelnya harus jadi subjek aktif. Jangan "kamu
harus menguasai angka". Jangan juga "tuntutan level berikutnya adalah penguasaan
angka". Tulis "Level berikutnya menuntut kamu datang dengan angkanya", atau "Di kursi
itu, yang ditanya pertama adalah angkanya".

Setiap blok harus menyebut satu hal HR yang konkret: desain organisasi, kalibrasi
performa, struktur gaji, efisiensi biaya, headcount, turnover, opsi restrukturisasi,
rencana rekrutmen, job description, direksi. Jangan berhenti di "kedalaman analisis di
setiap fungsi", sebut analisis apa.

Kalimat pendek, satu gagasan, maksimum lima belas kata. Sambung dengan "dan", "tapi",
"karena", "jadi".

Dilarang: merupakan, melainkan, namun, adapun, oleh karena itu, dengan demikian,
keunggulannya, secara mandiri, secara signifikan, hal ini, hal tersebut, teknologi ini
(sebut AI saja), kini (pakai sekarang), terjadi ketika.

Dilarang menguatkan dengan kata: sangat, sekali, luar biasa, amat, betul-betul,
mumpuni, solid. Kalau satu kelebihan butuh kata "sangat", berarti belum kamu jelaskan.

Satu kata benda abstrak (kedalaman, keluasan, posisi, tuntutan) hanya boleh sekali per
blok. Yang kedua, sebut dengan kata biasa.

Aturan altitude dan ai_level di atas adalah gagasan yang harus kamu sampaikan, bukan
kalimat yang harus kamu tiru. Tulis dengan kata-katamu sendiri.
```

## 8. Enforcement

Style rules that only live in a prompt get ignored on the roll of a dice. These are
mechanically checkable and belong in `VIOLATIONS` (`lib/generate.js:128`), where a hit
triggers the existing correction-and-retry loop rather than shipping stiff copy:

```js
[/\bmerupakan\b|\bmelainkan\b|\bnamun\b|\badapun\b/i, 'formal report connector'],
[/\bkeunggulannya\b|oleh\s+karena\s+itu|dengan\s+demikian/i, 'formal report connector'],
[/\bsecara\s+(mandiri|signifikan|langsung|optimal)\b/i, '"secara X" adverb'],
[/\bteknologi\s+ini\b|\bhal\s+(ini|tersebut)\b/i, 'vague reference; name the thing'],
[/\bsangat\b|\bsekali\b|\bluar\s+biasa\b|\bmumpuni\b/i, 'intensifier standing in for a reason'],
[/\b(penggunaan|pemanfaatan|penguasaan|pelaksanaan|peningkatan)\b/i, 'nominalization; use the verb'],
```

Plus one positive check inside `validate()`, since the deleted-reader failure is the
worst of them and the cheapest to catch:

```js
if (!/\bkamu\b/i.test(gap_body)) found.push('gap_body: no "kamu"');
if (!/\bkamu\b/i.test(ai_body)) found.push('ai_body: no "kamu"');
```

Note before applying: the fallback copy in `lib/copy.js` is held to the same validator
by `scripts/check-copy.mjs`, which passes today (576 combinations, 0 failures). The
`kamu` check breaks it — `AI_BY_LEVEL[1]`, `[2]` and `[4]` have no `kamu` in them. Give
those three a pass in the same change. `AI_BY_LEVEL[2]` also opens on "pemakaian",
which R2 rules out; the regex above does not catch it, but the fallback should not be
the one example in the repo breaking its own guideline.
