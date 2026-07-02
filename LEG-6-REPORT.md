# LEG 6 — Revenue Postback + Dashboard — Evidence Report

Branch: `leg-6-revenue` (off `leg-5-bridge` @ c0ca815). No push, no deploy, **no production DB access**, no sends. Schema migration **built but NOT run** (see below).

## Summary
Added a `conversions` table, a secured idempotent `/api/postback` receiver that joins conversions back to leads via subid and fires stop-on-conversion, manual admin entry, and a full revenue dashboard (per-provider EPC, per-source, attribution split, lead-quality hint, tracking-leak alerts).

## Review fixes (round 1 — blocking item + confirmations)
1. **Idempotency redesigned (was blocking).** The old `unique(subid, occurred_at)` double-counted network **retries** (same sale redelivered with a new timestamp) and keyed on the wrong identity. New design:
   - New columns: `transaction_id`, `conversion_type` (`initial`/`rebill`/`unknown`), `dedupe_key` (NOT NULL), `needs_review`.
   - Unique index is now **`(provider_slug, dedupe_key)`**. `dedupe_key` = `"tx:<transaction_id>"` when the network sends a txid — so **retries dedupe** (same txid) and **rebills insert as new rows** (new txid). When **no txid** is present, it falls back to `"st:<subid>:<occurred-minute>"` and sets **`needs_review=true`** for a human to confirm. `conversion_type` is populated from the postback `type` param (rebill/recurring → `rebill`).
   - Manual entries use a `"man:"`-namespaced key so they never collide with postback keys.
   - Implemented in `server/lib/subid.ts` (`computeDedupe`), used by `postback.ts` and `revenue.ts`.
2. **parseSubid confirmed + hardened.** publicIds are nanoids and can contain `-`/`_`, so parsing no longer splits on a delimiter — it **matches the trailing segment against the real provider slugs** (from the `providers` table, longest-match wins). Proof (`server/postback.test.ts`, 25 tests, all passing):
   - `ab-cd_ef123-gala` → `{ publicId: "ab-cd_ef123", providerSlug: "gala" }` ✓ (the requested case)
   - `ab-cd_ef123-direct_med`, `V1StGXR8_Z5jdHi6B-myT-sprout`, `x-gala-direct_med`, `x-sprout-gala` all parse correctly; `noseparator`/`-gala`/`gala`/unknown-suffix → `null`; longest-match wins when one slug is a suffix of another.
   - Idempotency tests prove: txid retry → same key; rebill → new key; no-txid same-minute → same key + `needs_review`; manual ≠ postback keyspace.
   - Run: `npx vitest run server/postback.test.ts` → **25 passed**.
3. **`ui-reference.html`** was searched across all of git history (`git log --all --full-history`) and **was never committed** — it is not recoverable from the repo. Please re-provide the file and I'll restore it to the repo root (leg-5's `/match` was built to the written spec in the meantime).

## Build verification (no deploy, no DB)
- `npx tsc --noEmit`: **0 new type errors** (still 18, all pre-existing; the one "new" line was index.ts 242→243 line-shift of the pre-existing providers-seed error).
- `npx vite build` → OK (RevenueOverview bundles into admin-pages chunk).
- `npx esbuild server/_core/index.ts --bundle` → OK (bundles `postback.ts` + `revenue.ts`, 2.3 mb, no errors).
- DB-free logic check: `parseSubid` correctly splits hyphenated publicIds (`test-1783010674869-gala` → `{test-1783010674869, gala}`), underscore providers (`direct_med`), and rejects malformed subids; `toCents` handles `$`/commas (`49.99`→4999).

## New env var (set in Railway before deploy)
- **`POSTBACK_SECRET`** — shared secret required on every `/api/postback` call. Requests without a matching `token` (or `secret`) param are rejected 401 and logged. If unset, all postbacks are rejected (fail-closed).

## Migration (built, NOT run tonight)
The columns/table are created by the existing boot bootstrap `ensureAffiliateWorkspaceSchema()` (`server/db.ts`, awaited in `server/_core/index.ts` before `listen`) on next deploy — no manual step required. The equivalent explicit SQL, if you prefer to run it at review:
```sql
CREATE TABLE IF NOT EXISTS `conversions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `subid` varchar(128) NOT NULL,
  `lead_id` varchar(36),
  `provider_slug` varchar(64) NOT NULL,
  `amount_cents` int,
  `occurred_at` timestamp NOT NULL,
  `source` enum('postback','manual') NOT NULL,
  `transaction_id` varchar(191),
  `conversion_type` varchar(16) NOT NULL DEFAULT 'unknown',
  `dedupe_key` varchar(191) NOT NULL,
  `needs_review` boolean NOT NULL DEFAULT false,
  `raw_payload` json,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `conversions_id` PRIMARY KEY(`id`),
  UNIQUE KEY `uq_conv_provider_dedupe` (`provider_slug`,`dedupe_key`),
  KEY `ix_conv_provider` (`provider_slug`),
  KEY `ix_conv_lead` (`lead_id`),
  KEY `ix_conv_txid` (`provider_slug`,`transaction_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

ALTER TABLE providers
  ADD COLUMN postback_param_map json,
  ADD COLUMN cookie_window_days int;
```
The table is unreleased (never created in prod), so this final schema applies cleanly on first deploy via the boot bootstrap; the bootstrap also has defensive `addColumnIfMissing` calls for the new columns.
Collation is `utf8mb4_0900_ai_ci` to match `leads` (AGENTS.md). DB errors in the postback/lookup path are logged with full driver detail, never swallowed.

## Postback URLs to paste into each affiliate dashboard
Base: `https://www.peptidepilot.me/api/postback?token=<POSTBACK_SECRET>&subid=<SUBID_MACRO>&txid=<TXID_MACRO>&amount=<PAYOUT_MACRO>&type=<TYPE_MACRO>&timestamp=<TIME_MACRO>`

**Include the transaction-id macro (`txid`)** — it is what makes retries idempotent and rebills distinct. The receiver accepts subid under `subid|sub1|subid1|aff_sub|s1|sid`, **txid under `txid|transaction_id|conversion_id|order_id|tid|cid`**, amount under `amount|payout|sale_amount|revenue|sale|amt`, and type under `type|conversion_type|event_type|txn_type|status`, so each network's native macro works directly:
- **Gala (Everflow, `sub1` echo):** `…/api/postback?token=SECRET&subid={sub1}&txid={transaction_id}&amount={payout}&type={conversion_type}&timestamp={unix_timestamp}`
- **direct_med (RevOffers/TUNE, offer 1304, `subid1`):** `…/api/postback?token=SECRET&subid={subid1}&txid={conversion_id}&amount={payout}`
- **sprout (RevOffers/TUNE, offer 1286, `sub1`):** `…/api/postback?token=SECRET&subid={sub1}&txid={conversion_id}&amount={payout}`
- **medvi (inactive):** same pattern once its network is confirmed.

Per-provider field remapping is supported via `providers.postback_param_map` JSON (e.g. `{"amount":"payout","transaction_id":"tid","type":"txn_type"}`) for networks that differ.

## IMPLEMENT coverage
1. **Conversions table (Drizzle):** `drizzle/schema.ts` `conversions` — id, subid, lead_id (nullable, resolved from subid), provider_slug, amount_cents (nullable), occurred_at, source enum('postback','manual'), raw_payload json (nullable), created_at. Unresolvable subids are stored with `lead_id NULL` and flagged in admin (Recent table + alerts "unresolved").
2. **Postback endpoint** (`server/routes/postback.ts`, mounted `/api/postback`, GET **and** POST): rejects without the env secret (logged); resolves lead_id by parsing `{publicId}-{providerSlug}`; **idempotent** via the `(subid, occurred_at)` unique key (duplicate → 200 `{duplicate:true}`, no double-count); logs every hit (recorded / duplicate / rejected); per-provider `postback_param_map` for amount field naming. On a resolved conversion it calls **`cancelSequenceForLead(leadId)`** (the only email-engine touch — stop-on-conversion: cancels pending drip + enqueues post_conversion).
3. **Manual entry** (`revenue.createManual` + form in RevenueOverview): pick provider, paste subid **or** look up by lead email, amount (USD), date; writes the same table with `source='manual'`; same idempotency + `cancelSequenceForLead`.
4. **Dashboard revenue views** (`server/routers/revenue.ts` + `client/src/pages/admin/RevenueOverview.tsx`, nav "Revenue" → `/admin/revenue`):
   - **Per provider:** clicks (provider_click_logs), conversions, conversion rate, revenue, **EPC** (revenue/clicks).
   - **Per acquisition source:** conversions → lead → earliest session, grouped by `utm_campaign` / `utm_content` and **entry surface** (bridge / funnel / library, from leg-4/5 `source_surface`).
   - **Attribution split:** email-attributed vs same-session vs unresolved (heuristic below).
   - **Lead-quality hint:** quiz-answer index distributions (goal Q1, insurance Q7, budget Q20) for converting vs non-converting leads. Read-only, no auto-tuning.
5. **Alerting:** conversions whose subid has **no matching `provider_click_logs`** click, and conversions whose click→conversion **gap exceeds the provider `cookie_window_days`** (default 30). Both surfaced in the admin "Tracking-leak alerts" panel.

## Acceptance test — RUN AT REVIEW (needs the DB; not run tonight)
After setting `POSTBACK_SECRET` and deploying (or pointing at the DB):
1. Find a real lead publicId (e.g. `test-1783010674869`). Fire with a transaction id:
   `curl "https://www.peptidepilot.me/api/postback?token=$POSTBACK_SECRET&subid=test-1783010674869-gala&txid=TX-TEST-1&amount=249.00&type=initial"` → expect `{ok:true,resolved:true,conversionType:"initial",needsReview:false}`.
2. Open `/admin/revenue`: the conversion appears in Per-provider (gala revenue +$249, EPC computed), Per-source (its session's utm/entry surface), Attribution, and Recent. The lead's pending drip is cancelled + post_conversion enqueued.
3. **Retry** — re-fire the identical curl (even with a different/no timestamp) → `{ok:true,duplicate:true}`; revenue does **not** double-count.
4. **Rebill** — same subid, `txid=TX-TEST-2&type=rebill` → inserts a **new** row typed `rebill` (revenue += again, correctly).
5. Manual entry with the same provider + a lead email → records `source='manual'`, same idempotency.
6. A postback with a subid that has no `/go` click → appears under alerts "no logged click".
7. A postback **without** a txid → recorded but flagged `needs_review` (⚑ in Recent).

## Conservative decisions (per unattended rules)
1. **Idempotency key = (provider_slug, dedupe_key)** where `dedupe_key = tx:<txid>` (retries dedupe, rebills insert) or, without a txid, `st:<subid>:<minute>` with `needs_review=true`. This replaces the original `(subid, occurred_at)` key flagged in review. Residual limitation: a **txid-less** network that redelivers a retry in a **different minute** would insert a second row — but it is flagged `needs_review` for a human, and the fix is to add the network's txid macro to the postback URL (documented above).
2. **Amount parsed as USD dollars → cents.** If a network sends cents, its value would be inflated ×100; the `postback_param_map` + `toCents` can be adjusted per provider. Documented.
3. **Attribution is a documented heuristic:** "email_attributed" = the lead has an `email_queue.clicked_at` at/before the conversion; else "same_session"; "unresolved" = no lead. The subid click log distinguishes surface (funnel/bridge/library) but not email-vs-page directly (emails link to `/results`, not `/go`), so the email-click signal is the honest proxy. Not auto-used for anything but reporting.
4. **Lead-quality shows raw answer indices** (not labeled options) to avoid coupling the query to option-array ordering; the column header explains the mapping. Labeling can be added client-side later.
5. **`cancelSequenceForLead` only fires on a resolved lead** and is wrapped so a failure never blocks recording the conversion.
6. **Postback fails closed** if `POSTBACK_SECRET` is unset (rejects all) — safer than accepting unauthenticated writes.
7. Did **not** run any SQL against production or send any email (rules 2 & 3). The stop-on-conversion wiring is code-only until deploy.

## Deferred
- Live acceptance test (needs DB/deploy) — commands provided above.
- Provider `postback_param_map` / `cookie_window_days` seed values (left NULL; defaults apply — 30-day window). Set per network at review.

## Changed files (7 modified + 5 new)
New: `server/routes/postback.ts`, `server/routers/revenue.ts`, `client/src/pages/admin/RevenueOverview.tsx`, `server/lib/subid.ts` (parse + idempotency helpers), `server/postback.test.ts` (25 passing unit tests).
Modified: `drizzle/schema.ts`, `server/db.ts`, `server/_core/env.ts`, `server/_core/index.ts`, `server/routers.ts`, `client/src/App.tsx`, `client/src/components/DashboardLayout.tsx`.

## Env vars to set (summary)
- `POSTBACK_SECRET` (required, new) — shared secret for `/api/postback`.
