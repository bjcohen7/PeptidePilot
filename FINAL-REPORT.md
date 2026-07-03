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
