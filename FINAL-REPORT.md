# PeptidePilot — Legs 4–6 Merge & Deploy — FINAL REPORT

Unattended finish. All three legs merged to `main`, deployed to production, verified with **plain**
curls (no cache-busters). No email sends. AGENTS.md honored in full.

`main` head after this report: see `git log`. Phase merge commits:
- Phase 1: `631246a` (leg-4) + `2483cf7` (Medvi retirement) + `101af05` (cache headers + AGENTS.md note)
- Phase 2: `0dbb7c4` (merge leg-5-bridge) + `d20c504` (/quiz+/match counts from QUIZ_MINUTES)
- Phase 3: `cd6aab1` (merge leg-6-revenue)

## Per-phase evidence

### Phase 1 — leg-4 (GLP-1 consolidation) + Medvi + cache
- Live homepage (plain curl): "Get matched to GLP-1 therapy" present; BPC-157 / Peptide Sciences /
  Core Peptides / "financial relationships" = 0; derived "22 quick questions"; Learn nav; footer disclosure.
- Library intact: `/learn`, `/peptides/semaglutide` → 200, canonicals unchanged.
- **Medvi retired:** seed `active:true`→`false` (providers.ts), results presentation entry removed;
  prod DB verified `SELECT slug,active` → **medvi=0** (gala/direct_med/sprout=1). `KNOWN_PROVIDER_SLUGS`
  intentionally keeps `medvi` so a legacy Medvi postback can still be *recorded* (not a render path).
- **Cache incident (Fable caught):** Cloudflare had served a stale pre-leg-4 homepage; my `?cb=` curls
  masked it. Fixed origin headers — catch-all HTML now `Cache-Control: public, max-age=0, must-revalidate`
  (was unset because `res.sendFile()` bypasses express.static's setHeaders); assets stay
  `max-age=31536000, immutable`. AGENTS.md now mandates plain-curl verification + Cloudflare purge after
  HTML deploys. Ben confirmed the GLP-1 homepage on a real device.

### Phase 2 — leg-5 (/match bridge) + count fix
- `/match` → 200, prerendered, canonical `/match`; alias `/peptides-for-weight-loss` → 200 + noindex.
- UTM-aware headline (browser-verified): `/match?utm_content=recovery` → hero swaps to
  "Curious about peptides? Start with the one that's actually clinically proven."
- **UTMs persist:** both CTAs render `href="/quiz?utm_source=fb&utm_campaign=testcamp&utm_content=recovery"`.
- `/quiz` meta now "free 4-minute" (was "2-minute"); `/quiz` + `/match` counts derive from `QUIZ_MINUTES`.

### Phase 3 — leg-6 (revenue) + live acceptance test
- Migration verified in prod: `conversions` table `COLLATE=utf8mb4_0900_ai_ci` (AGENTS.md), unique
  `uq_conv_provider_dedupe`, columns `transaction_id/conversion_type/dedupe_key/needs_review`;
  `providers.postback_param_map` + `cookie_window_days` present.
- Acceptance (live `/api/postback` with POSTBACK_SECRET, subid `test-1783010674869-gala`, lead 519a9df8):
  | step | result |
  |---|---|
  | valid (txid TX-ACC-1, $249, initial) | `{ok,resolved,conversionType:initial,needsReview:false}` |
  | duplicate (same txid) | `{ok,duplicate:true}` — **no 4th row** |
  | rebill (txid TX-ACC-2, $299, rebill) | new row, `conversionType:rebill` |
  | txid-less ($50) | recorded, **needs_review=1** |
  | bad token | **401 unauthorized** |
  - Conversions table: exactly **3 rows** (dup ignored). Per-provider gala: clicks 12, conv 3,
    revenue **$598**, **EPC $49.83**. Per-source join → `fb_test_camp / recovery / bridge`, $598.
  - Stop-on-conversion: lead `sequence_status=completed`, `conversion_at` set, pending emails cancelled,
    `post_conversion` enqueued — then **neutralized** (cancelled) so nothing sends. Whole-queue
    real-address pending+due rows = **0**. No emails sent to anyone.

## Postback URLs to paste into the affiliate dashboards
Base: `https://www.peptidepilot.me/api/postback?token=<POSTBACK_SECRET>&subid=<SUBID>&txid=<TXID>&amount=<PAYOUT>&type=<TYPE>&timestamp=<TIME>`
(Receiver accepts subid under `subid|sub1|subid1|aff_sub`, txid under `txid|transaction_id|conversion_id|order_id`,
amount under `amount|payout|sale_amount|revenue`, type under `type|conversion_type|event_type|status`.)

- **Gala — Everflow:**
  `https://www.peptidepilot.me/api/postback?token=<SECRET>&subid={sub1}&txid={transaction_id}&amount={payout}&type={conversion_type}&timestamp={unix_timestamp}`
- **direct_med — RevOffers/TUNE (offer 1304):**
  `https://www.peptidepilot.me/api/postback?token=<SECRET>&subid={subid1}&txid={conversion_id}&amount={payout}`
- **sprout — RevOffers/TUNE (offer 1286):**
  `https://www.peptidepilot.me/api/postback?token=<SECRET>&subid={sub1}&txid={conversion_id}&amount={payout}`
- **medvi — retired/inactive; do not enable.**

Always include `txid` — it is what makes retries idempotent and rebills distinct. Networks that omit a
txid record with `needs_review=true`. Per-provider field remaps go in `providers.postback_param_map`.

## Conservative decisions & deferred items
0. **ROADMAP — revisit email_2 / Ad A cost framing (added 2026-07-06).** Current copy is accurate — it
   explicitly cites brand *list* price for contrast — but as manufacturer cash-pay programs (NovoCare
   $149–499/mo, LillyDirect $299–449/mo) gain consumer awareness, the "$1,000+ vs our price" contrast will
   age and could read as misleading. Revisit the email_2 cost email and Ad A creative to lead with the
   cash-pay-inclusive framing before that shift lands. Not urgent; flagged so it doesn't get stale.
1. **~97 editorial "5-minute quiz" strings remain** (About-page CTA + ~96 blog article `contentHtml`).
   Out of the funnel/CTA scope leg-4 targeted; needs a wording decision (and whether to soften "peptide"
   framing in blog prose). NOT fixed. The funnel, page CTAs, meta, and `/quiz` are all 4-minute now.
2. **`ui-reference.html` / SPEC 4** was never in git history — unrecoverable. `/match` was built to the
   written spec. Re-provide the file to reconcile.
3. **Cloudflare root cause:** `/` already sent `max-age=0, must-revalidate` before the fix yet the edge
   served stale — this points to a Cloudflare "Cache Everything" rule/Edge TTL overriding origin headers.
   Origin fix is correct but Ben should check Cloudflare → Rules and purge after HTML deploys.
4. **Attribution** is a documented heuristic (email-click at/before conversion = email_attributed, else
   same_session, else unresolved) — reporting only, no auto-tuning.
5. **Acceptance test data left in prod** (clearly labeled): 3 conversions (subid `test-1783010674869-gala`,
   txids `TX-ACC-1/TX-ACC-2`, one txid-less) + a `visitor_sessions` row `acctest-test-1783010674869`,
   and lead 519a9df8 is now `sequence_status=completed`. This is the live acceptance evidence in
   `/admin/revenue` ($598). **Cleanup SQL when you're done reviewing:**
   ```sql
   DELETE FROM conversions WHERE subid = 'test-1783010674869-gala';
   DELETE FROM visitor_sessions WHERE id = 'acctest-test-1783010674869';
   -- optional: UPDATE leads SET sequence_status='active', conversion_at=NULL WHERE id='519a9df8-36ea-4d2e-a0a2-97f23d5f1e39';
   ```
6. **answer_echo** in emails is still always empty (pre-existing TODO) — unrelated, untouched.

## Current state of every system
- **Site:** GLP-1-only homepage/funnel live; `/match` + alias live; library (`/learn`, pSEO, blog) intact
  with canonicals; disclosure single-sourced (footer + results-CTA + email footer), no top banner.
- **Counts:** funnel/pages/meta/`/quiz`/`/match` derive from `QUIZ_MINUTES`(=4)/`QUIZ_QUESTION_COUNT`(=22).
  (Editorial blog prose still says 5-minute — item #1.)
- **Cache:** HTML `max-age=0, must-revalidate`; hashed assets immutable. Verify prod with PLAIN curls.
- **Providers (prod DB):** gala/direct_med/sprout active; **medvi inactive (0)**.
- **Revenue pipeline:** `conversions` table live; `/api/postback` live & secret-gated (fail-closed);
  idempotent on `(provider_slug, dedupe_key)`; `/admin/revenue` (EPC, per-source, attribution,
  lead-quality, alerts, manual entry) live; stop-on-conversion wired.
- **Email engine:** unchanged except the postback → `cancelSequenceForLead` wiring. No sends performed.
- **Env:** `POSTBACK_SECRET` set in Railway (fail-closed if unset).

---

## HOTFIX (post-merge, 2026-07-03) — match_score display % (commit 0e63be8)

**Severity:** a real new lead's email 0 rendered "600% fit" / "600% compatibility". Live production
bug affecting the pending drips of many real leads.

**Root cause — two paths, two truths on one field.** `shared/providerMatching.ts` scores `fitScore`
as a raw points sum in [0, 8] (budget +3, insurance +2, weight-loss +2, meds-both +1). The email path
(`buildPersonalization`) did `fitScore * 100` → 300–800% for real leads; the results page did
`fitScore/5` → "8/5". The earlier test sends showed 92% only because the test data stored `fitScore`
as a 0–1 fraction (0.92), not points.

**Fix:**
- `shared/matchDisplay.ts` — single source `matchPercentFromFitScore()`: normalizes points [0,8] and
  legacy 0–1 fractions to a (0,100] integer %, returns `null` otherwise. Used by BOTH
  `buildPersonalization` (all email paths) and the `VerdictResults` badge.
- Template hard clamp (`templates.ts`): `compatClause` + email-0-B subject render only when
  `match_score ∈ (0,100]`; 0 / NaN / null / >100 DROP the clause. No email can ever show 600% or 0%.
- No data migration — `buildPersonalization` re-derives at send time, so all pending drips for existing
  real leads render correctly. Pending sends were NOT cancelled (14 leads × 6 drips left intact).
- `client/src/pages/VerdictResults.tsx` badge changed from `{fitScore}/5` to `{pct}% match`.

**Field audit (only match_score diverged):** price / shipDays / promo / compliance come from the DB
`providers` table (same as the page); `whyMatch` + names from `provider_matches` (same field the page
reads); `answerEcho` is empty-in-email by design (benign absence).

**Evidence:**
- Real prod data render: fitScore 3→38%, 5→63%, 8→100% (were 300/500/800%); forced `matchScore=600` →
  clause dropped.
- Live verdict page badge now "92% match" (test lead; real points leads → "100% match" etc.).
- Tests: `server/matchDisplay.test.ts` (13) — normalization + clamp; 38 total pass. tsc clean; vite +
  esbuild OK. Deploy 0e63be8 SUCCESS; safety-rail plain curls green (/, /match, /results → 200).

**Files:** new `shared/matchDisplay.ts`, `server/matchDisplay.test.ts`; modified `server/email/worker.ts`,
`server/email/templates.ts`, `client/src/pages/VerdictResults.tsx`.

**Deferred/notes:** `answerEcho` still empty in emails (pre-existing TODO, unrelated). Test-data
generators in `server/routers/email.ts` still use 0–1 fractions — harmless (the deriver normalizes
them), left as-is to avoid churn.

---

## Hotfix review round 2 (Fable) — closures

**1. Deriver ambiguity fixed.** The `<=1` legacy-fraction branch mapped a valid points value of `1`
(worst match) to 100%. Prod audit: only **2** non-integer fitScores existed (both cohen test leads,
0.92); **zero real leads**. So the fraction branch was **deleted entirely** — `matchPercentFromFitScore`
is now points-only (`1 → 13%`, `8 → 100%`). The 2 test rows were normalized to points (8/6/5) and the
test-data generators in `server/routers/email.ts` now emit points. Tests added for `fitScore=1` (→13)
and `0.92` (→12, points).

**2. Business display gate (>= 60).** New `shouldDisplayMatchPercent()` (MIN_DISPLAY_PERCENT=60) —
the compatibility clause, the email0-B `% fit` subject, AND the verdict-page badge render **only** when
the derived % is ≥ 60. Weak matches (fitScore ≤4 → ≤50%) show no number (never inflate, never floor,
just omit). Tests at 59/60/61.

**3. Other raw-fitScore render sites:** none beyond email + the VerdictResults badge (both routed
through the deriver). `admin/SessionDetail.tsx` `{item.score}/{item.max}` renders quiz **dimension**
scores, not the provider fitScore — left as-is.

**Cloudflare item — RESOLVED/CLOSED.** Cloudflare rules were checked (no HTML cache rule existed), a
purge was performed, and the earlier stale reads were the reviewer's own fetch cache — not an edge/origin
problem. The origin header hardening (catch-all HTML `max-age=0, must-revalidate`; assets immutable)
remains as correct defense-in-depth. No further action.

**Blog "5-minute" count debt — CLOSED (standalone commit).** Mechanical replace of the hyphenated
"5-minute" quiz claim → "4-minute": 163 occurrences in `shared/blog-content.generated.ts` (all quiz
CTAs) + the About-page CTA (now `{QUIZ_MINUTES}`). Non-quiz time mentions (dosing "45 minutes",
guide "15 minutes", "3-5 minutes") use spaces and were untouched. Full-route crawl is now count-clean.

## Lead-capture leak — investigate / fix / recover / alarm (2026-07-05, commits 5273980, ef4804a, a309687)

**Symptom.** A 48h paid-traffic health snapshot surfaced 6 real Creative-4 leads (fb/ig) with NULL
`provider_matches`, no `experiment_variant`, and zero queued emails despite completing the full
22-question quiz (`rawQuizData` present, reached `/processing`→`/results`).

**Root cause.** `submitQuiz` wrote `provider_matches` + `experiment_variant` as a **separate best-effort
`UPDATE`** after `insertLead`, and enqueued the drip as **another** best-effort step — both in
`try/catch` that swallowed errors. A transient DB blip after the insert landed the row but lost the
follow-ups → a "shell" lead (email captured, pipeline incomplete) with **no signal**.

**Transition proof (the path is dead, not live).** The code that first taught `submitQuiz` to compute
matches/variant (`72cdb7a`) and enqueue emails (`f77142f`) deployed to prod in the leg-4/5/6 sequence
**Jul 2 16:42–19:49 UTC**. All shell leads — the 6 plus a June backlog — were created *before* that.
Post-transition: **47 real leads created after Jul 2 18:06, 0 shells**. The failure mode died with the
transition; the fixes below are belt-and-suspenders for the one residual risk (a transient enqueue miss).

**Fixes.**
- **Atomic insert** (`quiz.ts`) — `insertLead` now writes `provider_matches` + `experiment_variant`
  inside the INSERT. No post-insert UPDATE to lose.
- **Self-healing sweep** (`email/reconcile.ts`, new) — `findShellLeads()` + `reconcileIncompleteLeads()`:
  finds real, consented leads >1h old with NULL matches or 0 queued emails, recomputes matches from
  stored answers, backfills publicId/variant, and re-enqueues. **Warm window (96h):** ≤96h → standard
  drip from email_0; >96h → single `backfill_c` ("we owe you your results"); unscorable answers (older
  quiz shape) → tagged `quiz_stale` for the Segment C retake batch, never auto-sent. `quiz_stale` leads
  excluded from detection.
- **Circuit breaker** (Fable verdict 1) — > 10 shells in one sweep ⇒ heal NONE, fire `[LeakAlarm]`, wait
  for a human. A spike means an upstream regression; auto-sending to all of them would compound it.
- **Alarm surface** — cron runs the sweep hourly (+90s after boot), logs every shell under `[LeakAlarm]`;
  `revenue.alerts.shellLeads` renders outstanding shells in `/admin/revenue`.
- **SQL hardening** (Fable verdict 3) — `quiz_stale` added to the drizzle schema so it's written via the
  parameterized builder (raw interpolation removed); `lead.id` charset-guarded (`^[A-Za-z0-9_-]{1,64}$`)
  before reaching the raw-SQL enqueue helpers. (Ids are nanoids, not integers — charset is the right check.)

**Recovery.** 6 original + 4 backlog leads recovered (publicId + matches from `rawQuizData` + variant +
sequence); email_0 sent and **Resend-confirmed delivered**. The 4 six-answer partial leads (old quiz
version, unscorable) were already `quiz_stale=1` and hold for Segment C. Resend delivery pull across all
sends: **delivered, 0 bounces, 0 complaints** (the only DB bounces are 2 old `test@test.com` rows from
07-03, already suppressed).

**KNOWN EVENT — 3 cold recovery sends (Fable verdict 2, accepted).** The *first* reconcile sweep ran on
v1 (before the warm-window guard shipped in `ef4804a`) and auto-sent the standard email_0 to 3 backlog
leads ~3.5 weeks old — `miscevans00@gmail.com`, `cc05yy@yahoo.com`, `smbrantontexas@hotmail.com` (all
delivered). Accepted as a one-time event. They now carry full sequences, so `backfillSegment`'s
`NOT EXISTS(email_queue)` guard **automatically excludes them** from any Segment C batch — no double-send.

**Resend webhook — Svix 401 / 0-opens (bonus, `ef4804a`).** The handler verified
`JSON.stringify(req.body)` after `express.json()` re-parsed it, never matching the signed raw bytes →
every event 401'd → `opened_at`/`clicked_at` never populated (the sequencer's stop-on-silence/nudge rules
were flying blind). Fixed: mount the webhook with `express.raw()` and verify against the raw Buffer.
Proven in prod: valid signature → 200, bad signature → 401. Blind-period impact was nil — email_2 (day 3)
hadn't sent yet, so stop-on-silence had fired 0 times.

## Revenue dashboard — time-period support (2026-07-05, commit a1a962c)

`/admin/revenue` gained a period window (Today / Yesterday / Last 7 / Last 30 / All time / Custom range,
default Last 7), matching the sessions dashboard's chip selector. Backend (`revenue.ts`): `period` input +
`resolveWindow`/`priorWindow`/`windowSql` helpers; `perProvider`/`perSource`/`attribution`/`leadQuality`/
`recent` are windowed; new `summary` (window totals + prior-period delta) and `trend` (gap-filled per-day
revenue+conversions) procedures; `alerts` stays current-state (operational, not windowed). Frontend
(`RevenueOverview.tsx`): chip selector + custom date pickers, headline cards with prior-period delta on
Today/7d/30d, compact daily-revenue trend strip. Verified live: `today`→3 clicks, `last7`→48,
`custom Jul 3–4`→22. Email-metrics section (separate `EmailMetrics.tsx` page) noted as a follow-up.

## Webhook proven end-to-end + Segment C backfill launched (2026-07-06, commits `875fa55` + prior)

**Webhook — PROVEN.** After the Svix raw-body fix, prod logs show real Resend `email.delivered` events
arriving, passing signature verification, and being processed (e.g. for the two live test emails to Ben).
`opened_at` stays NULL only because **Open/Click Tracking is disabled on the Resend domain** (a dashboard
toggle, not a webhook bug) — Resend never sends `email.opened`. `email.delivered` is now recorded
(`delivered_at`; was a no-op), and bounce/complaint events flow (drive suppression + the guard below).
Action item for Ben: enable Open/Click Tracking in Resend to light up the opened/clicked metrics.

**Click tracking vs. /go/ subid attribution — unaffected.** Resend's click tracking rewrites the email's
links to route through its own redirect domain before landing on the final URL. This does NOT touch our
revenue attribution: the `/go/{slug}/{publicId}` subid lives inside our own redirect on peptidepilot.me
(the email CTA points at `/results/{publicId}`, and the `/go/` subid is formed on the results page at click
time), so Resend wrapping the outer link never strips or alters the subid. Open/click metrics and subid
attribution are independent.

**Sequence-priority + cap-exemption guards.** The worker batches in phases: Phase 0 dispatches
transactional `email_0_instant` + `post_conversion` UNCAPPED (they never count toward the bulk cap);
Phase A sends the rest of the sequence up to the remaining cap; Phase B sends backfill only from the cap
headroom left after reserving every still-pending sequence obligation due today. A backfill row can never
queue ahead of an email_0.

**Segment C backfill — LAUNCHED.** Prep: 405 pre-feature leads healed with `provider_matches` (no sends),
33 duplicates marked `excluded_duplicate`, `benjacobcohen00@` added to the internal-email filter, whyMatch
rewritten to always echo real budget/goal/insurance answers (512 leads re-healed). Enqueued **418 rows
(377 `backfill_c` + 41 `backfill_stale`), oldest signup Apr 19, oldest-first**. Sends are window-gated
(9–10:30am ET weekdays) and paced behind the drip by the reserve — so daily backfill volume = whatever the
cap has left after the sequence. **Auto-pause guard** (`[BackfillGuard]`): backfill halts (drip untouched)
if bounce >3% or complaint >0.1% over ≥20 dispatched backfill rows. A durable daily cron reports cumulative
sent/delivered/bounced/complained/opened/clicked.

---

## Experiment annotation — homepage direct-to-Gala copy (2026-07-14)

While `HOMEPAGE_CTA_MODE = 'gala'` (homepage CTAs → `/go-direct/gala`), the homepage copy was reframed from the quiz to a **2-minute eligibility-check** flow (2-minute check · licensed providers · a licensed clinician reviews the intake). **Read per-click conversion rates (funnel-starts and lead-submissions per 100 clicks) BEFORE vs AFTER this timestamp** — the copy change is a confound inside the direct-to-Gala experiment window, so pre-copy and post-copy clicks are not directly comparable. Scope was **`client/src/pages/Home.tsx` copy only**; `/quiz`, `/match`, results pages, and emails keep the real quiz copy (shared `QUIZ_MINUTES = 4` / `QUIZ_QUESTION_COUNT` untouched).

### Revert checklist — flipping `HOMEPAGE_CTA_MODE` back to `'quiz'` requires reverting this homepage copy set

All edits are in `client/src/pages/Home.tsx`. To revert (make it a checklist, not archaeology):

1. **Re-add the import:** `import { QUIZ_QUESTION_COUNT, QUIZ_MINUTES } from "@shared/quizConfig";`
2. **4 CTA buttons** ("Check your eligibility — 2 minutes" → back to the quiz text): the hero + footer buttons → `See if you match — free {QUIZ_MINUTES}-minute quiz`; the "What we match on" button → `See if you match`; the ranking-section button → `See my match`.
3. **Hero checklist item:** "2-minute eligibility check" → `{QUIZ_QUESTION_COUNT} questions</strong>, about {QUIZ_MINUTES} minutes`.
4. **`HOW_IT_WORKS` step 01:** title "Check Your Eligibility" → "Take the Quiz"; description → `` `Answer ${QUIZ_QUESTION_COUNT} quick questions about your goals, body, and budget. Takes about ${QUIZ_MINUTES} minutes.` ``.
5. **`<Seo>` meta `description`:** → `` `Answer ${QUIZ_QUESTION_COUNT} quick questions and get matched to licensed telehealth providers for GLP-1 (semaglutide & tirzepatide) treatment — by your goals, budget, and state. No insurance needed.` ``.
6. **"What we match you on" lead-in:** → `Your {QUIZ_QUESTION_COUNT}-question intake feeds a real ranking — not a generic list — across the factors that actually determine fit.`
7. **Footer lead-in** (under "Ready to see your match?"): → `About {QUIZ_MINUTES} minutes. Get matched to a licensed GLP-1 provider for your goals and budget — completely free.`
8. **Preview caption:** "Check your eligibility to see your real matches" → `Take the quiz to see your real matches`.

Hero H1/subhead were left unchanged (already quiz-free) — no revert needed there. Rebuild + redeploy after reverting (prerendered homepage HTML must regenerate).

## Experiment annotation — homepage direct leg swap: Gala → DM-direct (2026-07-15)

The homepage direct flow's destination was swapped from Gala to Direct Meds. The `/go-direct/gala` → `/go-direct/:provider` generalization means the same route serves both; **`/go-direct/gala` remains live (dormant, not deleted)**. Homepage CTAs now point at `/go-direct/direct_med`.

**Two legs, judged separately — the Gala baseline does NOT transfer to DM:**

- **Gala-direct leg — ran Jul 11–14, 2026.** Sub1 suffix `-gdirect`. A homepage copy change (quiz → 2-minute eligibility-check, see the `2026-07-14` annotation above) landed **mid-leg on Jul 14**, so pre-/post-copy clicks inside this leg are themselves a confound. Baseline observed: ~28% funnel-starts and ~6.6% lead-submissions **per click** — reported through Gala's Everflow funnel.
- **DM-direct leg — starts Jul 15, 2026.** Sub1 suffix `-dmdirect`. Reports through a **separate Everflow account** (DM's own — confirmed by Ian), a completely different funnel with different events. **The Gala per-click baseline (28% / 6.6%) does NOT carry over** — do not compare DM-direct conversion to it. Judge DM-direct on its own network's numbers from Jul 15 forward.

**Reading the networks:** in each account's report, `-gdirect` sub1s = the Gala leg; `-dmdirect` sub1s = the DM-direct leg. The admin **Homepage → Direct** card (was "Homepage → Gala") splits our own click capture by `provider_slug` into a Gala leg (Jul 11–14) and a DM-direct leg (from Jul 15) so the two stay readable side by side.

### `direct_med` has TWO distinct offers — never cross-wire them (resolved 2026-07-15)

| | **DM-network** | **DM-direct** |
|---|---|---|
| Path | Results-page `/go/direct_med` | Homepage `/go-direct/direct_med` |
| Network | RevOffers offer 1304 | Separate Everflow account (DM's own) |
| Click param | `subid1` | `sub1` |
| Postback macro | `{subid1}` | standard Everflow macro set |
| URL template | providers table `affiliateUrlTemplate` (UNTOUCHED) | `DM_DIRECT_BASE` in `server/_core/index.ts` |

Both are `provider_slug = 'direct_med'` but they are **different offers on different platforms**. The results-page `/go/direct_med` link and its providers-table template were left **completely untouched** by the homepage swap. The homepage DM-direct destination + its `sub1` param live only in `DIRECT_DESTINATIONS.direct_med` / `dmDirectUrl()`; the param name is env-overridable via `DM_DIRECT_SUBID_PARAM` (defaults to the confirmed `sub1`) so any future correction is a config change, not a deploy.

## Experiment annotation — bridge restyle + repoint to Gala-v2 (2026-07-20)

The homepage direct flow now runs through the **`/start` 3-question bridge** (added 2026-07-20), which hands off **provider-anonymously** to Gala's funnel. Three legs, non-overlapping in time — **judge each on its own; they are not 1:1 comparable:**

- **Gala-v1 — Jul 11–14, 2026.** Homepage → `/go-direct/gala` direct (no bridge). Landing `funnel/start` w/ `utm_content=lp-glp1-v4`. Sub1 `-gdirect`. **Final: 173 clicks / 140 sessions.** (A homepage copy change landed mid-leg Jul 14 — see the `2026-07-14` annotation.)
- **DM-direct — Jul 15–20, 2026. CLOSED.** Homepage → `/go-direct/direct_med` (direct, then via `/start` bridge Jul 20 AM). Separate Everflow account, sub1 `-dmdirect`. **Final count at close: 114 clicks / 91 sessions.** No longer receiving traffic; `/go-direct/direct_med` stays **dormant-not-dead** (route + config intact, just not linked).
- **Gala-v2 — Jul 20, 2026 →.** Homepage → `/start` bridge (3 taps) → `/go-direct/gala`. **New landing variant `src=lp-glp1-top5-mirror-c4e9`** (v1 used `lp-glp1-v4`), so **Gala-v2 is NOT 1:1 comparable to Gala-v1** — different landing page + a warm-up bridge in front. Same Everflow account and `sub1`/`-gdirect` suffix as v1, so both report to the same account (distinguish by date / landing variant, not by sub1 suffix).

**Bridge Q3 option set changed 2026-07-20 (Gala-v2):** was *"What have you tried so far?"* (Diet & exercise / Other programs or pills / First real step); now *"What matters most to you?"* (**Lowest monthly price / No insurance needed / Fastest start**) — same `bridge_q3` logging key, so pre/post-Jul-20 `bridge_q3` values are different option sets. Q1/Q2 unchanged.

**Provider-anonymous handoff:** the `/start` interstitial (headline / body / trust line) never names the provider and carries no provider-specific credentials, BMI line, or price — copy lives in a single `HANDOFF` config in `client/src/pages/Start.tsx`, so the **next** destination swap is a link + palette change only, never a copy rewrite. The destination is a single swap-point: `HANDOFF_PROVIDER` (client) + `DIRECT_DESTINATIONS` (server). Admin **Homepage → Direct** card now shows three legs (Gala-v1 / DM / Gala-v2) split by `provider_slug` + date.

## Experiment annotation — direct-flow SUSPENDED, homepage back to quiz (2026-07-21)

**The ad account was banned (2026-07-21); paid traffic is paused.** The homepage was returned to **quiz mode** so organic visitors enter OUR quiz (lead capture + drip), not the provider handoff. **Ledger closed** — final per-leg homepage→direct click counts (test rows excluded):

| Leg | Window | Path | Clicks / distinct sessions |
|---|---|---|---|
| **Gala-v1** | Jul 11–14 | homepage → `/go-direct/gala` (direct) | **173 / 140** |
| **DM** | Jul 15–20 | homepage → `/go-direct/direct_med` (direct, then bridge Jul 20) | **114 / 91** |
| **Gala-v2** | Jul 20–21 | homepage → `/start` bridge → `/go-direct/gala` | **10 / 9** |

Gala-v2 ran ~1 day before the ban — too small to read; not comparable to v1 (different landing variant + bridge). `/start` logged 312 distinct visits over the bridge's life (mostly the Jul 20 DM-bridge window + crawlers; only the 9 above reached the Gala handoff).

**What changed to revert:** `HOMEPAGE_CTA_MODE` **default flipped `gala` → `quiz`** (both `/api/cta-mode` and `HomepageCta` — so the prerendered homepage now ships `/quiz` anchors; env stays unset). The Jul-14 homepage copy set was reverted to quiz-accurate versions (the revert checklist above), EXCEPT the `<Seo>`/meta/og description, which stays the **compliant** "Medically-supervised weight management…" copy (OG compliance holds regardless of mode — organic shares render it).

**Kept deployed-but-dormant** (the instant relaunch path post-certification — no traffic hits them without ads): `/start` bridge, `/go-direct/*` routes (gala + direct_med), the three dashboard legs, Telegram alerts, and the compliant OG layer. **To relaunch:** set `HOMEPAGE_CTA_MODE=gala` (client-side deploy-free flip for real/JS users; redeploy to also re-bake `/start` anchors into the prerender).
