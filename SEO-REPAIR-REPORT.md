# SEO Repair Pass — Report for Review

Branch: `seo-repair-pass`. **Nothing is deployed, deleted, or noindexed.** This report + `SEO-REPAIR-prune.csv` are for your review. On approval I implement the code changes and execute your prune decisions.

All figures below are from the **live exported arrays** (`shared/pseoData.ts`, `shared/blog.ts`) — deduped ground truth, not raw file greps. `pseoData.ts.bak` is dead (0 imports).

---

## ⚠️ Scope reality check (bigger than the brief assumed)

| Section | Live pages |
|---|--:|
| /compare | 123 |
| /blog | 125 |
| /reviews | 76 |
| /goals | 74 |
| /stacks | 56 |
| /guides | 107 |
| /for | 110 |
| /peptides | 50 |

- **GLP-1 pages: 36** (not ~12–20). Item-1 scope (compare+blog+reviews) = **29**; **7 more** live in stacks/guides/peptides (your call whether to include).
- **YMYL prune: 347 pages**, of which **325 carry explicit dosing protocols** (mcg/mg + administration). This is the headline risk of the estate.
- **Cannibalization is systemic:** 4 reversed pairs **+ 6 exact-slug cross-section dupes**.

---

## Item 1 — GLP-1 CTA swap

**Mechanism (already exists):** `client/src/components/Glp1ContentCta.tsx` renders a GLP-1 provider CTA, gated by `isGlp1Topical()`, and is already imported into ComparisonPage / GuidePage / ReviewPage / BlogArticle. So this is an **update + widen**, not a new build:

1. **Rewrite the CTA copy** to spec: headline "Find the right GLP-1 provider for your budget", subtext "Licensed US providers, plans from ${FLOOR}/mo — matched to your budget and state, no paid placements."
2. **Floor price, not hardcoded:** derive `${FLOOR}` from a computed `PROVIDER_FLOOR_PRICE = Math.min(...providers.startingPrice)` in `shared/providerData.ts` (mirrors the DB `price_from_cents`; prerendered pages can't hit the live DB — see note). Currently `$179` (Gala). **Decision needed:** accept shared-constant mirror, or add a build-time DB fetch into the prerender step?
3. **UTM:** change the bare `/quiz` hrefs to `/quiz?utm_source=seo&utm_content={slug}` in the CTA component (2 hrefs) + the ComparisonPage sidebar CTA.
4. **Widen the trigger:** `isGlp1Topical()` only fires on semaglutide/tirzepatide/metabolic categories, so mounjaro/zepbound/victoza/etc. pages **don't get it today**. Add a slug/title match against the 13 terms so all 29 (or 36) pages qualify.

**The 29 pages that will get the swap (compare 17 / blog 8 / reviews 4):**
- **compare:** semaglutide-vs-tirzepatide, ozempic-vs-wegovy, mounjaro-vs-zepbound, semaglutide-vs-retatrutide, aod-9604-vs-semaglutide, semaglutide-vs-liraglutide, ozempic-vs-mounjaro, ozempic-vs-saxenda, wegovy-vs-mounjaro, wegovy-vs-saxenda, tirzepatide-vs-retatrutide, ozempic-vs-rybelsus, trulicity-vs-ozempic, victoza-vs-ozempic, semaglutide-vs-orforglipron, aod-9604-vs-tirzepatide, semaglutide-vs-metformin-weight-loss
- **blog:** semaglutide-vs-tirzepatide, what-is-retatrutide, compounded-semaglutide-vs-wegovy, tirzepatide-vs-retatrutide, aod-9604-vs-semaglutide, compounded-semaglutide-vs-brand-name, semaglutide-side-effects-management, glp1-peptides-explained
- **reviews:** semaglutide-review, tirzepatide-review, semaglutide-drops-review, semaglutide-vs-tirzepatide-review
- **(not scoped, GLP-1) stacks:** metabolic-stack, fat-loss-metabolic-ignition-stack · **guides:** how-to-use-semaglutide, how-to-use-tirzepatide · **peptides:** semaglutide, tirzepatide, retatrutide

---

## Item 2 — Beachhead 4 (DRAFTS for your review — not inserted)

Adds to each: a **cost-without-insurance** section (provider floor $179, brand list prices flagged for your verification), a **compounded explainer** with FDA-status disclosure, a **4–6Q FAQ** + **FAQPage JSON-LD** (new helper `buildFAQPageJsonLd` alongside `buildBreadcrumbJsonLd`), and **2–3 internal links in** (from homepage footer nav + 2 topical blog posts each).

> **Fact-check flags:** brand list-price numbers and current FDA shortage/compounding status change — I've marked every number `[VERIFY]`. Drug facts below are standard label facts; provider facts use the $179 floor.

### 2a. /compare/ozempic-vs-wegovy
**Cost without insurance (new section):**
> Ozempic and Wegovy are the same molecule (semaglutide) from the same manufacturer. Without insurance, brand list prices run roughly **$950–$1,350/mo `[VERIFY]`**. Licensed telehealth providers offering compounded semaglutide start at **$179/mo** (all-inclusive: medication, provider visits, support). [CTA]

**Compounded version explainer (new):**
> A "compounded" semaglutide is prepared by a licensed pharmacy rather than the brand manufacturer. **Compounded semaglutide is not an FDA-approved product** and is not reviewed by the FDA for safety, effectiveness, or quality. Compounding is permitted only under specific conditions and requires a prescription from a licensed provider. Discuss risks and benefits with a clinician.

**FAQ (FAQPage JSON-LD):** (1) Are Ozempic and Wegovy the same drug? (2) Which is approved for weight loss vs diabetes? (3) Can I switch between them? (4) What does each cost without insurance? (5) Is compounded semaglutide the same as Ozempic/Wegovy?
**Internal links in:** footer "GLP-1 comparisons" nav; from blog/compounded-semaglutide-vs-wegovy and blog/semaglutide-side-effects-management.

### 2b. /blog/tirzepatide-vs-retatrutide
**Key correction to honor "no invented facts":** **Retatrutide is investigational — NOT FDA-approved** (phase 3 as of `[VERIFY date]`). The draft states this prominently. Tirzepatide is an approved dual GIP/GLP-1 agonist (Mounjaro/Zepbound).
**Cost section:** tirzepatide via telehealth from **$179/mo**; retatrutide "not commercially available — investigational only." **Compounded explainer** (same FDA disclosure). **FAQ:** (1) Is retatrutide available to buy? (2) How does a triple agonist differ from tirzepatide's dual? (3) Is compounded retatrutide legal/safe? (4) When might retatrutide be approved? (5) What does tirzepatide cost?
**Links in:** footer; from blog/what-is-retatrutide, compare/tirzepatide-vs-retatrutide.

### 2c. /blog/aod-9604-vs-semaglutide
**Framing:** AOD-9604 (a synthetic HGH fragment) is **not FDA-approved for weight loss and has limited/weak human evidence**; semaglutide is an approved GLP-1 with robust trial data. Draft is evidence-honest (no efficacy claims for AOD-9604).
**Cost section** ($179 floor for semaglutide telehealth). **Compounded explainer.** **FAQ:** (1) Does AOD-9604 work for weight loss? (evidence-state answer) (2) Is AOD-9604 FDA-approved? (3) How does its mechanism differ from semaglutide? (4) Is it safe? (5) Cost comparison.
**Links in:** footer; from compare/aod-9604-vs-semaglutide, blog/best-peptides-for-weight-loss.

### 2d. /compare/mounjaro-vs-zepbound
**Same-molecule framing** (both tirzepatide; Mounjaro→T2 diabetes, Zepbound→chronic weight management). **Cost section** (brand ~**$1,000–1,350/mo `[VERIFY]`**; telehealth tirzepatide from $179/mo). **Compounded explainer.** **FAQ:** (1) Are Mounjaro and Zepbound the same drug? (2) Which is for weight loss? (3) Insurance coverage differences? (4) Cost without insurance? (5) Is compounded tirzepatide the same?
**Links in:** footer; from compare/tirzepatide-vs-retatrutide, blog/semaglutide-vs-tirzepatide.

---

## Item 3 — YMYL prune CSV → `SEO-REPAIR-prune.csv`

347 rows: `url, section, slug, risk_class, recommended_action, impressions_relevance_FILL_FROM_GSC`. Risk auto-classified by content inspection (dosing patterns: mcg/mg + before-bed/twice-weekly/reconstitute/units/subq/intranasal).

| Section | dosing-protocol | condition-targeting | benign |
|---|--:|--:|--:|
| /goals | 73 | 0 | 1 |
| /stacks | 56 | 0 | 0 |
| /guides | 96 | 0 | 11 |
| /for | 100 | 4 | 6 |

**Recommended-action defaults (you overlay GSC impressions, then I execute):**
- **dosing-protocol** → `rewrite` (strip all administration → what-it-is/evidence-state) if it has ranking value; `noindex` (or `410` if truly dead) if low-impression. **325 pages.**
- **condition-targeting** → `rewrite` educational, no protocol.
- **benign** → keep.

**I need your GSC export** to fill `impressions_relevance` and split rewrite-vs-noindex-vs-410. Give me the export (url + impressions/clicks) and I'll merge it in and you approve per-row.

---

## Item 4 — Cannibal merges + 301s

**No per-path 301 mechanism exists today** (only naked→www + trailing-slash). I'll add a small ordered redirect map in `server/_core/index.ts` (301 loser→winner) + set the winner as canonical.

**Reversed pairs (4):**
| Keep (winner) | 301 from (loser) | Note |
|---|---|---|
| compare/selank-vs-semax | blog/semax-vs-selank | your example; cross-section |
| compare/epithalon-vs-ghk-cu | compare/ghk-cu-vs-epithalon | intra-compare |
| compare/sermorelin-vs-ipamorelin | compare/ipamorelin-vs-sermorelin **+ blog/ipamorelin-vs-sermorelin** | 3-way — verify which ranks |
| compare/pt-141-vs-kisspeptin | compare/kisspeptin-vs-pt-141 | intra-compare |

**Exact-slug cross-section dupes (6)** — same slug is BOTH a /compare and a /blog page (self-cannibalizing):
bpc-157-vs-tb-500, semaglutide-vs-tirzepatide, bpc-157-vs-ghk-cu, aod-9604-vs-semaglutide, tirzepatide-vs-retatrutide, ipamorelin-vs-sermorelin. **Recommendation:** keep the `/compare` version (structured, richer), 301 the `/blog` twin → `/compare`, or canonical the blog→compare. **Winner choice per pair needs your GSC** (whichever ranks). I'll propose winners once you send impressions.

---

## Item 5 — Hygiene

- **Canonicals:** ✅ already absolute `https://www.` form (both `Seo.tsx` `absoluteUrl()` and `scripts/prerender-routes.ts`). No fix needed.
- **Naked→www 301:** ✅ covers **all paths** (`req.originalUrl`), plus trailing-slash strip. No fix needed.
- **"5-Minute Quiz" strings:** ✅ none left in /compare or /guides templates (line uses `{QUIZ_MINUTES}`); blog was fixed prior. **Clean** — the item is effectively closed; I'll do one final repo-wide grep before deploy.
- **Sitemap:** dynamic `/sitemap.xml` from the route list — **auto-updates** when pages are noindexed/merged (no manual regen). I'll confirm merged/noindexed pages drop out.
- **FAQPage JSON-LD helper:** add `buildFAQPageJsonLd()` to `Seo.tsx` (none exists; FAQ page builds it inline).

---

## Item 6 — (post-approval + deploy) ~15 URLs for GSC reindex
Deferred until deploy. Will include: the 4 beachhead URLs, the 29 GLP-1 CTA pages' top performers, the 301 winners, and any high-impression rewrites.

---

## Fable verdicts — LOGGED (2026-07-06)
1. **Floor price:** computed shared constant ✅ + startup consistency check (constant vs live providers table, loud log on mismatch) + AGENTS.md note (price changes require rebuild for static pages).
2. **YMYL = NOINDEX-FIRST:** dosing-tier pages with **≥50 impressions/90d** (GSC) → individual educational rewrite (zero administration, human-reviewed). All other dosing-tier → **noindex now**, keep serving, re-evaluate at 8 weeks, 410 the still-worthless. Condition-targeting (/for, /goals) → noindex default; **410 the medically-exploitative class regardless of impressions** (see list below).
3. **Cannibal:** `/compare` wins by default; GSC overrides only where the blog twin outranks by **20+ positions on the shared query**.
4. **Drafts:** every `[VERIFY]` resolved with a cited manufacturer source or the sentence dropped — no placeholders. Final drafts → `SEO-REPAIR-beachhead-drafts.md`.
5. **CTA swap applies to all 36 GLP-1 pages** (not just the 29 scoped).

## Item 2b — 410 "medically-exploitative" candidates (for Ben's confirmation)
**Tier A — recommend 410 now (regardless of impressions):**
/for/: alzheimers, parkinsons, multiple-sclerosis, lupus, autoimmune-disease, hashimotos, hashimotos-thyroiditis, graves-disease, schizophrenia, bipolar-disorder, depression, anorexia, binge-eating-disorder, **vaccine-injury-recovery**, long-covid-brain-fog, post-covid-fatigue, lyme-disease, mold-toxicity, heavy-metal-toxicity, chronic-fatigue-syndrome, chronic-fatigue, fibromyalgia, neuropathy, **feline-kidney-disease** (veterinary), stroke-recovery
/goals/: ptsd-support, ibd-support, stroke-recovery
**Tier B — sensitive, noindex not 410:** type-2-diabetes, diabetes, pre-diabetes, adrenal-fatigue-hpa-axis-dysfunction
**Dupes to clean up:** `lyme-disease` appears twice; `hashimotos` + `hashimotos-thyroiditis` near-dupes.

## Item 4 — 301 map (built; /compare default). ⚠️ two conflicts need your call
Merged pairs (301 loser → winner, winner = canonical). Spot-check the ⭐ big-impression ones in GSC's query view:

| Winner (keep) | 301 from (loser) | Note |
|---|---|---|
| compare/selank-vs-semax | blog/semax-vs-selank | reversed, cross-section |
| compare/epithalon-vs-ghk-cu | compare/ghk-cu-vs-epithalon | reversed intra-compare |
| compare/pt-141-vs-kisspeptin | compare/kisspeptin-vs-pt-141 | reversed intra-compare |
| compare/sermorelin-vs-ipamorelin ⚠️ | compare/ipamorelin-vs-sermorelin **+** blog/ipamorelin-vs-sermorelin | **3-way**; also which compare direction wins is a coin-flip — **your GSC spot-check** |
| compare/bpc-157-vs-tb-500 ⭐ | blog/bpc-157-vs-tb-500 | exact-slug dupe |
| compare/bpc-157-vs-ghk-cu | blog/bpc-157-vs-ghk-cu | exact-slug dupe |
| compare/semaglutide-vs-tirzepatide ⭐ | blog/semaglutide-vs-tirzepatide | exact-slug dupe |

**🔴 CONFLICT — beachhead vs. cannibal (needs your decision):** two of the exact-slug dupes are *also* Item-2 beachhead pages we're expanding:
- `tirzepatide-vs-retatrutide` — exists as BOTH compare + blog; blog is the beachhead we're expanding.
- `aod-9604-vs-semaglutide` — same.

If /compare wins (default), the expanded **blog** beachhead gets 301'd away — wasting the expansion. **Options:** (a) make the **blog** version the winner for these two (expand blog, 301 compare→blog), or (b) move the beachhead expansion onto the **compare** version (301 blog→compare). I recommend **(b)** — keep /compare canonical estate-wide, put the rich content there. Your call before I wire these two.

## Sweep wiring (built from `shared/seoPruneList.ts`)
- **410 (28):** dropped from `prerenderRoutes` (no render, out of sitemap) + a server middleware returns real **HTTP 410** for `GONE_410_PATHS`. Internal links: I'll grep + strip links to the 28.
- **noindex (301):** route `noindex:true` (prerendered HTML gets `meta robots noindex`; already excluded from sitemap) + the goal/stack/guide/for page components pass `noindex` to `<Seo>` for client renders. Pages stay fully served.
- **Reconciliation:** prerender route count `before − 28 = after`; noindex pages still present + rendering. **Reversal:** documented in `seoPruneList.ts` (remove from list + rebuild).
- **Post-deploy curl matrix (15):** 5× 410 (status line), 5× noindex (meta present), 5× keeper (no noindex leaked — guards the template-level over-catch).

## Blocked on GSC (then implement on branch, report-before-deploy)
GSC export fills the CSV impressions column → drives (a) the dosing-tier rewrite-vs-noindex split (≥50 imp/90d), (b) cannibal winner overrides (20+ position). On arrival I implement: CTA swap (36 pages) + floor constant + consistency check + AGENTS.md; FAQPage helper + beachhead content; 301 map (/compare winners); noindex sweep + 410 Tier-A; then plain-curl verify + Cloudflare purge, and hand over the ~15 reindex URLs.
