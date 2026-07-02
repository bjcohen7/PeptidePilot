# LEG 4 — GLP-1 Consolidation — Evidence Report

Branch: `leg-4-consolidation` (off `main` @ 3f47a9d). No push, no deploy, no production DB access, no email sends. Build verified locally.

## Summary
Made the root funnel GLP-1-only, demoted the peptide library to an SEO feeder under "Learn", collapsed all quiz-count / disclosure copy to single sources of truth, and added `source_surface` / `click_type` tagging so the dashboard separates monetizable GLP-1 clicks from peptide-vendor noise. Pixel/fbq code was not touched.

## Build verification (no deploy)
- `npx vite build` → ✓ built (client compiles; Home + all pSEO pages + new components).
- `npx tsx scripts/prerender.tsx` → ✓ generated 720 routes (SSR-renders the rewritten Home without error).
- `npx tsc --noEmit`: 18 errors, **all pre-existing on `main`** (verified by stashing leg-4 changes → identical 18). The 3 that appear "new" are line-shifts of pre-existing errors (analytics 483→499, PseoPages 720→721 / 1456→1457; identical text). **Leg-4 introduced zero new type errors.**
- Prerendered homepage grep: `BPC-157`=0, `Peptide Sciences`=0, `financial relationships`=0; "Get matched to GLP-1 therapy" present; "Answer 22 quick questions" present (count derived).

## New files
- `shared/quizConfig.ts` — single source: `QUIZ_QUESTION_COUNT` (=`QUIZ_QUESTIONS.length`=22, derived), `QUIZ_MINUTES` (=4), `QUIZ_QUESTION_LABEL`, `QUIZ_MINUTES_LABEL`.
- `client/src/components/SiteDisclosure.tsx` — canonical `SITE_DISCLOSURE` string + `<SiteDisclosure>` (used by the footer) + `LibraryAffiliateNote` / `LIBRARY_AFFILIATE_NOTE`.
- `client/src/components/Glp1ContentCta.tsx` — `isGlp1Topical()` deterministic classifier + `<Glp1ContentCta topical placement>` (prominent card vs quiet footer line).

## IMPLEMENT item coverage

### 1. GLP-1 as the site
- `client/src/pages/Home.tsx` fully rewritten to GLP-1: hero "Get matched to GLP-1 therapy in minutes", licensed-provider trust markers ("Licensed US providers · No insurance needed"), GLP-1 how-it-works + match-factors, GLP-1 results copy. **Removed** the BPC-157/TB-500/Ipamorelin top-match preview card and the "Peptide Sciences"/"Core Peptides" links; replaced with an illustrative GLP-1 provider match card (no brand, no hard price — see conservative choices).
- **Tracking preserved:** Home.tsx contains no fbq() calls; the pixel base code + all fbq() live in `client/src/main.tsx` (`initMetaPixel()`) and `client/src/lib/metaPixel.ts`, both untouched. PageView/ViewContent history is unaffected.
- Nav CTAs point at the GLP-1 quiz: Navbar "Find my match" and the "Quiz" link already target `/quiz/flow`; all Home CTAs target `/quiz`.

### 2. Peptide library → SEO feeder
- **No slugs/canonicals changed.** All `/peptides|goals|compare|stacks|guides|for|reviews|blog` routes still prerender (720 routes) with data-driven canonicals (verified `…/peptides/semaglutide` → canonical `https://www.peptidepilot.me/peptides/semaglutide`).
- **Demoted under "Learn":** `Navbar` nav is now Quiz · Learn · About (added `/learn`; the non-functional "Results" top-nav link — needs a session — was moved out of primary nav; Results remains in the footer). `Footer` RESOURCES adds "Learn".
- **Per-page GLP-1 CTA flag (config, not guesswork):** added optional `glp1Topical?: boolean` override to all 7 pSEO interfaces (`shared/pseoData.ts`) + blog (`shared/blog-types.ts`). Default is the deterministic `isGlp1Topical()` classifier (categories ∈ {Fat Loss, Metabolic Health, Appetite Control, Blood Sugar, Weight Loss}, or goal ∈ {fat-loss, metabolic-health, body-recomposition, weight-loss}, or peptide ∈ {semaglutide, tirzepatide}). Topical content pages get a **prominent** inline + end-of-article CTA; non-topical pages get a **quiet** footer CTA. Wired into PeptideProfile, GoalPage, ComparisonPage, StackPage, GuidePage, ForConditionPage, ReviewPage, BlogArticle.
- Research-vendor affiliate data (`vendors[]`, `researchVendors`) left as-is; verified it is **not rendered as links** in any content-page component (only PubMed reference links render), so no new funnel surface exists around them.
- No peptide email sequence or peptide quiz built.

### 3. Consistency pass (single source of truth)
- **Counts:** `QUIZ_QUESTION_COUNT`/`QUIZ_MINUTES` from `shared/quizConfig.ts` replace every hardcoded "20 questions / 5 minutes / 22 / 4-minute" in Home, About, all pSEO pages, PseoPages, BlogArticle, and the QuizEntry interstitial. A repo grep for the old count/minute strings across in-scope files returns nothing.
- **Disclosure:** one `SiteDisclosure` component drives the footer (the only web footer). **Deleted** the "no financial relationship(s) with any … vendor/brand" claims in `Home.tsx` (the "We Have No Skin in the Game" section → rewritten to "Independent by design": independence from manufacturers/providers **without** denying commissions) and `About.tsx` (mission paragraph + "Radical Independence" principle rewritten). Library pages: `LibraryAffiliateNote` available but not attached — **no content-page component renders outbound vendor links** (verified), so there is no vendor-link location to disclose.
- **Meta/OG:** the prerender `/` head was already GLP-1-positioned; Home's runtime `<Seo>` now matches ("Get Matched to GLP-1 Therapy in Minutes"). Library pages keep topic-specific meta.

### 4. Events
- New columns (via idempotent schema bootstrap in `server/db.ts` + Drizzle types in `drizzle/schema.ts`; **migration built, NOT run** — applied on deploy): `provider_click_logs.source_surface`/`click_type`, `affiliate_clicks.source_surface`/`click_type`, `click_events.source_surface`/`click_type`, `visitor_sessions.source_surface`. Columns inherit the tables' `utf8mb4_0900_ai_ci` collation (matches `leads`); `addColumnIfMissing` surfaces driver errors (never swallowed) per AGENTS.md.
- Population: `/go/:provider/:publicId` → `source_surface` (query `surface`, default `funnel`) + `click_type='glp1_provider'`; `quiz.trackAffiliateClick` accepts + stores both (default funnel/glp1_provider); `GLP1PromoBox` passes `library`/`glp1_provider`; `startVisitorSession` classifies the landing path (`funnel`|`library`|`bridge`).
- Dashboard: `analytics.summary` returns `clickBreakdown { glp1Provider, peptideVendor, other }` (affiliate_clicks by click_type + provider_click_logs); `InsightsOverview` shows "GLP-1 Provider Clicks" (monetizable) and "Peptide Vendor Clicks" cards.

## Acceptance criteria
- **Zero contradictory disclosures / zero mismatched counts in a full-route crawl:** counts are config-derived everywhere in-scope; the "no financial relationship" contradictions are deleted. (See Deferred for `Legal.tsx`/`Terms` which are already consistent, and the email footer which is out of scope this leg.)
- **No research-vendor links on any funnel page:** homepage vendor links removed; verified no funnel/content component renders research-vendor links.
- **All library URLs still 200 with correct canonicals:** 720 routes prerender; slugs/canonicals unchanged.
- **Dashboard shows GLP-1 vs peptide split:** delivered (columns + population + `clickBreakdown` + two admin cards).

## Conservative decisions (per unattended rules)
1. **`ui-reference.html` / SPEC not needed here** (that's leg-5) — n/a.
2. **QUIZ_MINUTES = 4** chosen as the convergent value (quiz interstitial, emails, and the leg-5 `/match` CTA all say 4); the stale homepage "5 minutes" dropped. Declared as a constant (minutes aren't derivable from question count).
3. **Homepage match-card is illustrative** — no specific provider brand and no hard dollar price (providers/prices are DB-driven and could drift); labeled "Example". Avoids a stale/︎misleading static price.
4. **"Results" removed from primary nav** (it needs a session to be useful) in favor of "Learn"; Results stays reachable in the footer.
5. **Peptide-vendor click tagging is partial by design:** only clicks that fire a tracked mutation get `click_type`. Raw research-vendor `<a>` links in content were never tracked and none are currently rendered, so none were instrumented (no new funnel surface, per the prompt).
6. **Home email-capture box kept** (reframed to GLP-1) — it's a harmless no-backend lead magnet with no vendor links; removing it would drop a capture surface.
7. **Prerender vs client component split for pSEO detail pages is pre-existing:** client routes `/peptides/:slug`→`PeptideProfile` (new topical CTA, live for users); prerender uses `PseoDetailPage` (PseoPages.tsx) whose CTA had its counts corrected. Both are GLP-1 quiz CTAs; not a regression. main.tsx uses `createRoot` (CSR), so no hydration mismatch.

## Deferred / not done (with reason)
- **Meta CAPI `custom_data` surface/type tags** (`server/routes/capi.ts`): not added this leg — the CAPI payload already carries supplier/peptide; surface/type live in our first-party tables which feed the dashboard. Low value vs risk; flagged for a follow-up.
- **`LibraryAffiliateNote` attachment:** vacuously satisfied — no content page renders vendor links today. Component is ready if `vendors[]` is ever rendered.
- **About page deeper GLP-1 rewrite:** only the contradictions + count were fixed (acceptance-scoped); the page's general "peptide" framing remains but contains no false disclosures or wrong counts.
- **Pre-existing type errors (18)** left untouched (not introduced by this leg; unrelated to scope).

## Changed files (23 modified + 3 new)
New: `shared/quizConfig.ts`, `client/src/components/SiteDisclosure.tsx`, `client/src/components/Glp1ContentCta.tsx`.
Modified: `client/src/pages/Home.tsx`, `About.tsx`, `BlogArticle.tsx`, `PseoPages.tsx`, `QuizEntry.tsx`, `admin/InsightsOverview.tsx`, `pseo/{PeptideProfile,GoalPage,ComparisonPage,StackPage,GuidePage,ForConditionPage,ReviewPage}.tsx`, `components/{Footer,Navbar,GLP1PromoBox}.tsx`, `server/db.ts`, `server/_core/index.ts`, `server/routers/{analytics,quiz}.ts`, `drizzle/schema.ts`, `shared/pseoData.ts`, `shared/blog-types.ts`.

## Migration to run at review (NOT run tonight)
The new columns are added by the existing runtime bootstrap (`ensureAffiliateWorkspaceSchema` in `server/db.ts`) on next boot — no separate migration command required. If you prefer an explicit ALTER instead, the equivalent is:
```sql
ALTER TABLE provider_click_logs ADD COLUMN source_surface varchar(32) DEFAULT 'funnel', ADD COLUMN click_type varchar(64) DEFAULT 'glp1_provider';
ALTER TABLE affiliate_clicks    ADD COLUMN source_surface varchar(32) NULL, ADD COLUMN click_type varchar(64) NULL;
ALTER TABLE click_events        ADD COLUMN source_surface varchar(32) NULL, ADD COLUMN click_type varchar(64) NULL;
ALTER TABLE visitor_sessions    ADD COLUMN source_surface varchar(32) NULL;
```
(All inherit `utf8mb4_0900_ai_ci` from their tables, matching `leads`.)
