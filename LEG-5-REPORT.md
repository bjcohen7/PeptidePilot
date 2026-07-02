# LEG 5 — /match Bridge Landing — Evidence Report

Branch: `leg-5-bridge` (off `leg-4-consolidation` @ 631246a). No push, no deploy, no production DB, no sends.

## Summary
Added a focused, prerendered, mobile-first bridge landing at `/match` (+ ad alias `/peptides-for-weight-loss`) that honors peptide-curiosity ad hooks and pivots to the GLP-1 quiz, carrying UTMs through and firing bridge analytics events. Reuses leg-4's `SiteDisclosure` and `source_surface='bridge'` session tagging.

## Build verification (no deploy)
- `npx vite build` → OK. `npx tsx scripts/prerender.tsx` → **722 routes** (was 720; +/match +/peptides-for-weight-loss).
- `npx tsc --noEmit`: still 18 errors, **all pre-existing**; leg-5 added **0 new type errors** (verified by diff against the leg-4 error set).
- `/match/index.html` (9.1 kB) + `/peptides-for-weight-loss/index.html` generated. Grep checks: hero present, both CTAs present (`id=bridge-cta-primary` + `bridge-cta-secondary`), footer disclosure present, quiz link `/quiz`, **no site-nav search box**, **no "peptide sciences"/"core peptides"**, no outcome-promise phrases; canonical = `https://www.peptidepilot.me/match`; alias `robots: noindex, nofollow`.

## New files
- `client/src/pages/Match.tsx` — the bridge page (bare route, own layout, own footer disclosure).
- `client/src/lib/bridgeHeadlines.ts` — UTM-aware headline map (`resolveBridgeHeadline`).

## Modified
- `client/src/App.tsx` — lazy `Match` import + bare routes `/match` and `/peptides-for-weight-loss` (no PublicLayout → no nav/footer chrome).
- `client/src/AppPrerender.tsx` — `Match` import + prerender routes (indexable first paint).
- `scripts/prerender-routes.ts` — prerender entries: `/match` (indexed) + `/peptides-for-weight-loss` (`noindex`, alias).

## IMPLEMENT coverage
1. **Route /match (+ alias):** single-purpose page, no site nav. Content per spec — hero "The most clinically proven peptide for weight loss is a GLP-1."; subline (semaglutide/tirzepatide = peptides with trials → find your provider); three proof points (peptide→GLP-1 framing; trial-attributed average weight loss with "results depend on you and your provider" — **no outcome promise, no specific %**; licensed US providers / no insurance); one CTA repeated once ("See if you match — free {QUIZ_MINUTES}-minute quiz") → `/quiz` carrying UTMs; footer = `SiteDisclosure`. Mobile-first, centered single column, `max-w-[560px]`, content sized to fit 375px without scrolling.
2. **UTM-aware headline (light):** `bridgeHeadlines.ts` maps 2 creative tokens (`recovery`, `bpc`) → a "curious about peptides? start with the clinically proven one" hero; default otherwise. Matched by case-insensitive substring on `utm_content`/`utm_campaign`. Resolved in `useState` init so the client's first render already has the right variant.
3. **Events:** pixel `PageView` fires app-wide via `SessionTracker` (mounted at App root, only excludes `/admin`) — `/match` inherits it, no per-page pixel code needed. `bridge_view` fires on mount (with headline variant + utm), `bridge_cta_click` on CTA click (both via `trackMetaCustomEvent`). Downstream sessions are tagged `source_surface='bridge'` by leg-4's `classifySurface()` in `startVisitorSession` (a `/match` landing → `bridge`).

## Acceptance criteria
- **/match renders with zero layout shift on mobile:** prerendered (instant first paint), fixed single-column layout, no async content above the fold, icons are inline SVG (no reflow). *Not measured on a real device this session (no deploy) — designed for zero CLS; flag for a Meta Test Events / Lighthouse check post-deploy.*
- **UTMs persist into the quiz session:** SessionTracker captures utm_* at session-start on the `/match` landing (same localStorage session persists through the SPA nav to `/quiz`), and the CTA also appends `window.location.search` to `/quiz`. Lead attribution is available via `visitor_sessions` (utm_* + `source_surface='bridge'`) joined to the lead by `leadId`.
- **Events fire:** `bridge_view`, `bridge_cta_click`, and inherited `PageView` — verify in Meta Test Events before scaling spend (post-deploy).
- **No research-vendor links, no outcome promises:** verified by grep on the prerendered page.

## Conservative decisions (per unattended rules)
1. **`ui-reference.html` / SPEC 4 is ABSENT from the repo** (searched repo-wide). Built to prompt-5's written content spec using the existing design system (brand CSS vars, DM Serif hero), mobile-first. Flag: reconcile against SPEC 4 when the reference is available.
2. **Trial-attributed weight-loss proof point softened:** stated as "substantial average weight loss … results depend on you and your provider" with **no specific number** — avoids any outcome-promise / unverifiable-claim risk. If you want a specific trial range cited, provide the source and I'll add it with attribution.
3. **UTM headline map is a code module** (not runtime-editable). "Editable without deploy" would need a config table/endpoint; deferred and flagged. Kept to 2 tokens.
4. **Alias `/peptides-for-weight-loss` is `noindex`**, canonical points to `/match` — avoids duplicate-content while keeping the ad URL live.
5. **`entry_surface` on the lead:** not denormalized onto `leads`; it is derivable via `visitor_sessions.source_surface='bridge'` + `leadId`, which leg-6's attribution join uses. Avoided touching the lead-creation/tracking flow (AGENTS.md guardrail). A denormalized `leads.entry_surface` column can be added later if a direct field is preferred.

## Deferred
- Real-device CLS / Meta Test Events verification (needs deploy).
- Runtime-editable headline map (config table/endpoint).

## Changed files (3 modified + 2 new)
New: `client/src/pages/Match.tsx`, `client/src/lib/bridgeHeadlines.ts`.
Modified: `client/src/App.tsx`, `client/src/AppPrerender.tsx`, `scripts/prerender-routes.ts`.
