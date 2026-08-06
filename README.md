# Strategic HR with AI — teaser quiz

Chatbot-style implementation of `strategic-hr-teaser-spec.md.docx`, with §4 of that
spec superseded by `result-copy-matrix-final.md`. Three questions asked as a
conversation, then a personalised path from where the visitor is now to what
they're aiming for, then the program reveal and Open House CTA.

Indonesian, informal "kamu". Mobile-first — the traffic source is a social post.

## The two screens

The chat ends the moment the third question is answered. It says nothing about
the result — two lines, no button — then a curtain closes over it and it takes
itself to **`/hasil?a=1-2-1`**. No second decision to make: the visitor already
chose by finishing the quiz.

Splitting it this way is the point: in one document the program card was just
four more chat bubbles, carrying the same weight as an acknowledgement. The hero
withholds the program name deliberately, and the reveal now has a screen of its
own to be the payoff on.

`/hasil` plays as a deck, one beat per screen, advancing on a tap:

| Scene | What |
| --- | --- |
| 0 | Loading. One step per thing the quiz actually asked, ticking over in order |
| 1 | The path, and under a hairline, `Untuk sampai ke sana` as two sentences |
| 2 | `Bagaimana AI bisa membantumu` |
| 3 | `Program ini dirancang khusus untuk membuatmu bisa meraihnya.` — types itself out, a bar fills, no tap |
| 4 | The program. One screen, centred, nothing after it but the CTA |

Scene 1 carries the gap copy with the path because the gap only reads while both
ends of the path are still on screen.

The hint is per-scene and names what the tap opens, which is worth more than the
generic `Ketuk untuk lanjut`: scene 1 reads `Bagaimana AI membantu saya?` and scene 2
reads `Cari tahu lebih lanjut`.

Advancing is a tap anywhere, or Enter / Space / →. Each scene locks for 1.4s
before it will move on and before the *Ketuk untuk lanjut* hint appears, so a
stray tap can never skip a beat the visitor has not read yet. Under
`prefers-reduced-motion` the lock drops to zero and the transitions go instant.

Scene 3 is the exception: it advances itself. The line types out a character at a
time, a bar fills under it, and the program opens on its own — the wait is what
makes the last screen land as a release rather than as one more tap. Taps stay
locked out for its whole run, and no hint appears, because there is nothing to tap.
A hidden copy of the finished line holds the paragraph box open so the type-on does
not shove the scene around, and the full sentence is in the DOM from the first frame
for anyone reading with a screen reader. Reduced motion gets the whole line at once
and a short hold.

The answer indices ride in the URL, so refresh, back/forward and a shared link all
reproduce the same result. They are indices only, and every one of them has to name
a real option in `public/quiz-data.js`, so a hand-edited URL cannot forge a result —
it redirects to `/` instead. Nothing is fetched: the copy is a lookup in the same
table the page already imports, so the loading scene is purely a designed beat and
the reveal has no failure mode to handle.

The non-HR exit stays entirely in the chat. It is not a program reveal.

## Run

```sh
npm install        # zero dependencies — this just writes a lockfile
npm start          # → http://localhost:3000
```

No credentials, no configuration, no network. `GET /api/health` returns `{ok: true}`.
`npm test` walks all 108 answer paths and checks the copy each one resolves to.

## How the result copy works

Blocks B (`Untuk sampai ke sana`) and C (`Bagaimana AI bisa membantumu`) are the only
two strings on the result screen that vary. Both are hand-written and selected by
lookup in `public/result-copy.js` — six variants for the gap block, four for the AI
block, ten strings in total. `result-copy-matrix-final.md` holds them alongside the
voice rules they follow, and is the source of truth for edits.

```
gap_body = GAP[role_type][aspiration is breadth ? 'breadth' : 'goal']
ai_body  = AI_BY_LEVEL[ai_level]
```

`{fn}` is replaced with the visitor's function (`rekrutmen`, `L&D`, `compensation`,
`HR operations`), `{to}` with the destination (`Head of HR` or `HR Business Partner`).
The `head` and `hrbp` aspirations share one string per role type, because only the
destination name differs between them.

**These blocks used to be generated per visitor** through OpenRouter, with a tone
validator, a self-correcting retry, a static fallback and a 448-variant pre-generation
pass so a person could read every string before launch. That is all gone. Three
variables fused into two sentences produced connective filler: the model had to invent
a bridge between inputs that do not naturally join, and no amount of prompt work made
the seam disappear. Dropping to two variables and writing the strings by hand removes
the problem rather than constraining it, and six variants is small enough to read end
to end. The result screen now has no runtime dependency and cannot fail.

The decision-chain question that supplied the third variable (`altitude`) went with
it, which is why the quiz is three questions rather than four.

`npm test` (`scripts/check-copy.mjs`) walks all 108 reachable answer paths and checks
that each lands on a non-empty pair, that no `{fn}` / `{to}` placeholder survives
substitution, that the non-HR exit and out-of-range indices derive nothing, and that a
short list of brand-level bans still holds: em dashes, `Anda`, `Bapak/Ibu`, timeframe
promises, salary or outcome figures, AI-replaces-headcount framing.

## The chatbot layer

Acknowledgements are one plain word per question ("Oke.") — a beat that says the
answer landed, then moves on. They live on the question, not the option, in
`public/quiz-data.js`. Earlier they read each answer back with an interpretation
("Oke, L&D. Kamu kerja di bagian yang hasilnya paling lambat kelihatan."); that made
the bot sound like it was grading the visitor mid-quiz, and it spent the insight
before the reveal had a chance to. All interpretation now belongs to `/hasil`.

Chat behaviours: typing indicator before each message, character-by-character
reveal, answers echoed as the visitor's own bubbles, options as tappable chips,
back button that rewinds the conversation. `prefers-reduced-motion` collapses
typing and animation to instant.

## Analytics

Every answer POSTs to `/api/track`, appended as JSONL to `data/events.jsonl` —
fires per question, not only on completion, so drop-off is visible per screen
(spec §5). Fields: `role`, `role_type`, `ai_level`, `aspiration`, `completed`,
`exited_non_hr`, `oh_clicked`, `other_programs_clicked`, plus a per-visit `session`
id. Unknown fields are dropped server-side.

Swap this for the HubSpot call before launch. `role_type` + `aspiration` is the
segment sales should get.

## Files

| Path | What |
| --- | --- |
| `public/index.html` | The chat — three questions, then the handoff to `/hasil` |
| `public/hasil.html` | The reveal — the loading scene and the scene deck that ends on the program |
| `public/app.css` | Tokens and every shared style. Both pages also inline the tokens and the background so first paint is never a white flash |
| `public/quiz-data.js` | Questions, options, derived variables, handoff, reveal, result and exit copy. Single source of truth for everything except the two result blocks |
| `public/result-copy.js` | The two lookup tables for blocks B and C, and the voice rules their strings follow |
| `result-copy-matrix-final.md` | The matrix in prose, with the reasoning. Supersedes §4 of the spec |
| `TONE.md` | Why the copy reads the way it does. Editorial reference now that nothing enforces it in code |
| `lib/env.js` | Loads `.env` before any module reads `process.env` |
| `server.js` | Static serving, `/api/track`, `/api/health`. Extensionless paths fall back to `.html`, so `/hasil` resolves — a static host needs the equivalent (Vercel: `cleanUrls`) |
| `scripts/check-copy.mjs` | Walks all 108 answer paths and checks the copy each resolves to |

## Still open before launch (spec §6)

1. **The ten result strings need curriculum-expert sign-off.** They are the whole
   payoff of the quiz and were written by marketing. Read them in
   `result-copy-matrix-final.md`.
2. **Exit screen CTA destination** — currently `#program-lain`. If one program is
   most often the right next-best fit, link it directly.
3. **Open House CTA has no supporting line.** The button sits under the program
   summary with no reason to attend attached.
4. **No capture on the exit screen.** Decide whether non-HR visitors are worth
   anything.
5. **Program page must be live** before this ships — "Program ini dirancang khusus
   untuk membuatmu bisa meraihnya" points at it.

Also unresolved by this build: the analytics sink is a local file.
