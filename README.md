# Strategic HR with AI — teaser quiz

Chatbot-style implementation of `strategic-hr-teaser-spec.md.docx`. Four questions
asked as a conversation, then a personalised path from where the visitor is now to
what they're aiming for, then the program reveal and Open House CTA.

Indonesian, informal "kamu". Mobile-first — the traffic source is a social post.

## The two screens

The chat ends the moment the fourth question is answered. It says nothing about
the result — two lines, no button — then a curtain closes over it and it takes
itself to **`/hasil?a=1-2-1-0`**. No second decision to make: the visitor already
chose by finishing the quiz.

Splitting it this way is the point: in one document the program card was just
four more chat bubbles, carrying the same weight as an acknowledgement. The hero
withholds the program name deliberately, and the reveal now has a screen of its
own to be the payoff on.

`/hasil` plays as a deck, one beat per screen, advancing on a tap:

| Scene | What |
| --- | --- |
| 0 | Loading. Four steps tick over while the path is assembled |
| 1 | The path, and under a hairline, `Yang dibutuhkan untuk sampai ke sana` |
| 2 | `Tentang AI` |
| 3 | `Ini program yang dibangun untuk lompatan itu.` |
| 4 | The program. Full screen, centred, above the fold, with the detail below it |

Scene 1 carries the gap copy with the path because the gap only reads while both
ends of the path are still on screen.

Advancing is a tap anywhere, or Enter / Space / →. Each scene locks for 1.4s
before it will move on and before the *Ketuk untuk lanjut* hint appears, so a
stray tap can never skip a beat the visitor has not read yet. Under
`prefers-reduced-motion` the lock drops to zero and the transitions go instant.

The answer indices ride in the URL, so refresh, back/forward and a shared link all
reproduce the same result. They are indices only, and `/api/reveal` re-derives
everything from the canonical table, so a hand-edited URL cannot forge a result —
it fails the same validation a forged POST would. The chat fires the `/api/reveal`
request as soon as the last question is answered and stashes it in
`sessionStorage`, so by the time the loading scene plays the copy is usually
already local: the four steps are a designed beat, not a spinner. The last step
holds until the data is actually in, with a 9s ceiling, so a cold model call
stretches the beat instead of the page claiming to be finished.

The non-HR exit stays entirely in the chat. It is not a program reveal.

## Run

```sh
npm install        # zero dependencies — this just writes a lockfile
npm start          # → http://localhost:3000
```

Works with no credentials: the result copy falls back to the reviewed static
strings in `lib/copy.js`. To switch on generated copy:

```sh
cp .env.example .env   # add OPENROUTER_API_KEY (https://openrouter.ai/keys)
npm start
```

`GET /api/health` reports whether the model path is live, which model is
configured, and how many variants are cached. `npm test` checks the fallback copy
against the spec's hard constraints across all 576 combinations.

## How the AI part works

Blocks B (`Yang dibutuhkan untuk sampai ke sana`) and C (`Tentang AI`) on the
result screen are generated per visitor through **OpenRouter**, defaulting to
`google/gemini-3.6-flash`. Everything else is fixed copy from the spec.

**Model choice was measured, not assumed** — same 10 combinations, same prompt:

| Model | Passed the gate | Retries needed | All 448 variants |
| --- | --- | --- | --- |
| `google/gemini-3.6-flash` (default) | **10 / 10** | 0 | **$1.51** |
| `google/gemini-2.5-flash` | 7 / 10 | 4 | $0.41 |

2.5 Flash is mechanically fine but keeps reaching for *sekadar* ("merely") to
describe the reader's current job — the deficiency framing the spec forbids — even
after being told twice not to. It also blended adjacent `altitude` / `ai_level`
rules into single outputs. 3.6 Flash followed each rule exactly, held the register
("Tuntutan berikutnya adalah…" rather than "kamu harus…"), and was faster: **~5s
cold**, instant cached.

**Opus-tier models are deliberately not used on this project.** If 3.6 Flash ever
regresses, step sideways within the Gemini family or to `anthropic/claude-sonnet-5`
(~$2.02 for all 448) — not up to Opus.

- **No SDK.** OpenRouter's `/api/v1/chat/completions` is OpenAI-compatible, so
  this is one plain `fetch` in `lib/generate.js`. The project has zero runtime
  dependencies.
- **Swap models with one env var.** `OPENROUTER_MODEL` takes any slug from
  <https://openrouter.ai/models>; nothing in the code is provider-specific. Because
  the cache bounds this workload at 448 generations, the *lifetime* cost of the
  whole app is a rounding error at any tier — $0.28 to $2 depending on the model.
  Cost is not the deciding factor here; tone and rule adherence are.
- **Two provider quirks are handled**, both verified against OpenRouter's live
  model metadata. Gemini supports `reasoning` but *not* `reasoning_effort`, so the
  code sends the portable `reasoning: {effort}` form — the OpenAI-style field would
  have been silently dropped, leaving depth uncontrolled. And because Google's
  schema dialect has historically rejected `additionalProperties`, a schema-shaped
  400 triggers one automatic retry without `response_format` rather than failing
  every call forever. (Flash accepted the schema in testing; the retry is
  insurance.)
- **`lib/generate.js`** holds the system prompt — the spec's §4 rules translated
  into Indonesian instructions — and requests **structured outputs**
  (`response_format: json_schema`, `strict: true`), so the response is always
  exactly `{gap_body, ai_body}` and never prose wrapping the copy. Parsing is
  still tolerant of a stray code fence, because strict-mode enforcement varies by
  provider on OpenRouter.
- **The client never sees the key.** The browser posts four answer *indices*;
  the server derives `role_type` / `role_fn` / `altitude` / `ai_level` /
  `aspiration_to` from its own canonical table (`public/quiz-data.js`). No visitor
  text reaches the model, so the endpoint isn't a prompt-injection surface.
- **Every response is validated** against the hard constraints: word caps, no em
  dashes, no "Anda", no questions, no timeframe promises, no salary figures, no
  AI-replaces-headcount framing, no *sekadar* / *kamu harus* (deficiency framing the
  spec forbids), no English outside the six permitted loanwords. `validate()`
  reports *all* violations at once, not the first.
- **One self-correcting retry.** A rejected draft is sent back with the broken
  rules named, which recovers a good share of failures — telling it only the first
  violation made it fix that and break another, hence reporting all of them.
  Second failure means static copy; a third roll of the dice is worse than the
  reviewed strings. This is a public marketing asset — unreviewed copy that breaks
  a rule must never render.
- **Failure is always silent to the visitor.** Bad key, exhausted credits, unknown
  model, timeout, truncation, malformed JSON: the result screen still renders, per
  spec §4. The reason lands in the server log with the fix named
  (`401 unauthorized — check OPENROUTER_API_KEY`).
- **Results are cached** by `role_type|role_fn|altitude|ai_level|aspiration`. The
  spec recommends pre-generating ~192 variants and serving them statically; this
  cache is the live-generation equivalent, so only the first visitor in a
  combination pays latency and tokens. It's in-memory — move it to Redis or a
  build-time JSON file before this sees real traffic on more than one instance.
  This, not prompt caching, is the real cost control here.
- **Prompt caching** is requested via an explicit `cache_control` breakpoint on
  the system prompt when the model slug is `anthropic/*`. Note the system prompt is
  well under Anthropic's minimum cacheable prefix, so caching most likely will not
  engage — it costs nothing to leave in and starts working if the prompt grows.

`RESULT_EFFORT` sets reasoning depth, `low` by default (short, tightly-specified
microcopy). Raise to `medium` if the copy reads thin.

## The chatbot layer

Per-answer acknowledgements ("Oke, L&D. Kamu kerja di bagian yang hasilnya paling
lambat kelihatan.") are **written, not generated** — they live next to each option
in `public/quiz-data.js`. That's deliberate: they appear instantly with no network
round trip, and they're reviewable copy on a marketing asset. The model is spent
where the combinatorics actually make hand-writing impossible: the 576-variant
result blocks.

Chat behaviours: typing indicator before each message, character-by-character
reveal, answers echoed as the visitor's own bubbles, options as tappable chips,
back button that rewinds the conversation. `prefers-reduced-motion` collapses
typing and animation to instant.

## Analytics

Every answer POSTs to `/api/track`, appended as JSONL to `data/events.jsonl` —
fires per question, not only on completion, so drop-off is visible per screen
(spec §5). Fields: `role`, `role_type`, `altitude`, `ai_level`, `aspiration`,
`completed`, `exited_non_hr`, `oh_clicked`, `other_programs_clicked`, plus a
per-visit `session` id. Unknown fields are dropped server-side.

Swap this for the HubSpot call before launch. `role_type` + `altitude` is the
segment sales should get.

## Files

| Path | What |
| --- | --- |
| `public/index.html` | The chat — four questions, then the handoff to `/hasil` |
| `public/hasil.html` | The reveal — the loading scene and the scene deck that ends on the program |
| `public/app.css` | Tokens and every shared style. Both pages also inline the tokens and the background so first paint is never a white flash |
| `public/quiz-data.js` | Questions, options, derived variables, handoff, reveal, result and exit copy. Single source of truth, imported by both browser and server |
| `lib/generate.js` | System prompt, OpenRouter call, constraint validation, cache |
| `lib/env.js` | Loads `.env` before any module reads `process.env` |
| `lib/copy.js` | Static fallback for blocks B and C |
| `server.js` | Static serving, `/api/reveal`, `/api/track`, `/api/health`. Extensionless paths fall back to `.html`, so `/hasil` resolves — a static host needs the equivalent (Vercel: `cleanUrls`) |
| `scripts/check-copy.mjs` | Constraint check across all combinations |

## Still open before launch (spec §6)

1. **Q2 options need curriculum-expert sign-off.** They are the load-bearing
   question and were written by marketing.
2. **Exit screen CTA destination** — currently `#program-lain`. If one program is
   most often the right next-best fit, link it directly.
3. **Open House CTA has no supporting line.** The button sits under the program
   bullets with no reason to attend attached.
4. **No capture on the exit screen.** Decide whether non-HR visitors are worth
   anything.
5. **Program page must be live** before this ships — "Ini program yang dibangun
   untuk lompatan itu" points at it.

Also unresolved by this build: the analytics sink is a local file, and the result
cache is per-process.
