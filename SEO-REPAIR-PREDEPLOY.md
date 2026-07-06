# SEO Repair Pass — Pre-Deploy Report

**Branch:** `seo-repair-pass` · **Base:** `main` · **Status:** NOT deployed (this report is the gate)
**Build:** ✅ PASS (`built in 2.08s`) · **tsc:** 18 errors, all pre-existing (0 in my files) · **Tests:** 84 pass / 9 fail — the 9 fail identically on `main` (pre-existing, affiliate + quiz; untouched here)

---

## 1. Diff summary (23 files, +1299 / −116)

### Mechanics (pre-wired on branch, not reworked)
| File | What |
|---|---|
| `shared/seoPruneList.ts` (+346) | 28 × `GONE_410_PATHS`, 301 × `NOINDEX_PATHS`, `isGone410()` / `isNoindexed()` |
| `shared/seoRedirects.ts` (+24) | 10 cannibal-loser → winner 301s, `redirectTarget()` |
| `server/_core/index.ts` (+16) | 410 middleware + 301 middleware before SPA catch-all; `void checkProviderFloorConsistency()` at boot |
| `server/lib/providerFloorCheck.ts` (+33) | startup `[ProviderFloor]` drift check (static const vs live table) |
| `scripts/prerender-routes.ts` (+20) | `noindex` flag on routes; 410/301 paths excluded from render set |
| `client/src/components/Seo.tsx` (+13) | `buildFaqPageJsonLd()` helper |
| `client/src/components/Glp1ContentCta.tsx` (+36) | widened GLP-1 topical trigger |
| `shared/providerData.ts` (+10) | `PROVIDER_FLOOR_PRICE` derived constant ($179) |

### Content landed this session (approved verbatim)
| File | What |
|---|---|
| `shared/pseoData.ts` (net −? ; +cost/compounded/risks fields) | **2a** ozempic-vs-wegovy + **2b** mounjaro-vs-zepbound: `costWithoutInsurance`, `compoundedNote`, 5-item `faqItems` each. **Doc 5** melanotan-2 guide rewritten: risk-first H1 "Melanotan-2: What It Is, the Evidence, and the Serious Risks", `steps=[]`, `whatYouNeed=[]`, `commonMistakes=[]`, 4 `risks`, 5 approved `faqItems`. `GuidePageData.risks?` + `ComparisonPageData.costWithoutInsurance?/compoundedNote?` added. |
| `shared/blog-content.generated.ts` (+8/−?) | **2c** tirzepatide-vs-retatrutide + **2d** aod-9604-vs-semaglutide: appended approved lead / cost / compounded-disclosure / FAQ HTML. **Dedupe** (see §2). **Table fix**: bpc-157-vs-ghk-cu + semax-vs-selank raw markdown tables → HTML `<table>`, content-preserving. |
| `shared/blogFaq.ts` (NEW +19) | `BLOG_FAQ` for the 2 beachhead blogs — mirrors on-page FAQ, feeds FAQPage JSON-LD |
| `client/src/pages/pseo/ComparisonPage.tsx` (+37) | renders cost/compounded section (amber `AlertTriangle` box) + emits FAQPage `<script>` when `faqItems` present |
| `client/src/pages/pseo/GuidePage.tsx` (+45) | **conditional**: `steps.length>0` gates HowTo JSON-LD + inline script + steps section + steps badge; `risks` section; FAQPage from `faqItems`; `whatYouNeed`/`commonMistakes` guarded |
| `client/src/pages/BlogArticle.tsx` (+9) | FAQPage JSON-LD when `BLOG_FAQ[slug]` present |
| `client/src/pages/pseo/{ReviewPage,StackPage,PeptideProfile,ForConditionPage}.tsx` (+2..5 each) | `noindex={isNoindexed(path)}` wired |

### Commits this session
- `7d1ae07` — 2a/2b comparison (fields + render + FAQPage)
- `d579b4c` — 2c/2d blog (append + dedupe) + blogFaq + BlogArticle/GuidePage + melanotan-2 doc 5
- `<latest>` — table conversion on 2 cannibal winners

---

## 2. Dedupe cut boundaries (tirzepatide-vs-retatrutide `contentHtml`)

The entry was doubled — a full copy of the **AOD-9604** article had been concatenated onto the end, plus raw markdown tables inside that junk copy.

- **Removed:** ~17,183 chars — the entire concatenated AOD-9604 block (**41 `AOD-9604` references excised**, confirmed via `git show d579b4c`).
- **Last line KEPT** (legit article ending): `…weight-loss-effects</p>`
- **First line REMOVED** (junction): the `<p>'''# AOD-9604…` paragraph that began the pasted duplicate, through the trailing `…clinical-trials-show/</a></p>`.
- **Post-dedupe verification (current file):** junction `# AOD-9604` in tirzepatide entry = **0** ✓; entry retains approved FAQ lead-in ("Can I buy retatrutide") ✓; no stray `<table>` (the markdown table lived inside the removed copy) ✓.
- **Constraint honored:** only the concatenated AOD copy was cut. Zero prose edits to the legit tirzepatide article; zero cell edits in the table conversions.

---

## 3. 15-URL curl matrix (run against prod AFTER deploy)

Plain curl, **no cache-buster** (per AGENTS.md). Purge Cloudflare before running.

### A. 5 × retired → expect `HTTP/2 410`
```
curl -sI https://www.peptidepilot.me/for/alzheimers            | head -1
curl -sI https://www.peptidepilot.me/for/anorexia              | head -1
curl -sI https://www.peptidepilot.me/for/autoimmune-disease    | head -1
curl -sI https://www.peptidepilot.me/for/binge-eating-disorder | head -1
curl -sI https://www.peptidepilot.me/for/bipolar-disorder      | head -1
```

### B. 5 × noindex keep → expect `HTTP/2 200` + `<meta name="robots" content="noindex`
```
for u in /goals/fat-loss /stacks/cognitive-enhancement-stack \
         /guides/how-to-use-peptides-for-crossfit-training /for/metabolic-syndrome /goals/muscle-growth; do
  echo "== $u =="; curl -s "https://www.peptidepilot.me$u" | grep -o 'name="robots" content="[^"]*"' | head -1
done
```

### C. 5 × keepers → expect `HTTP/2 200` + **NO** noindex leak (grep returns empty)
```
for u in /compare/ozempic-vs-wegovy /compare/mounjaro-vs-zepbound \
         /blog/tirzepatide-vs-retatrutide /blog/aod-9604-vs-semaglutide /guides/how-to-use-melanotan-2; do
  echo "== $u =="; curl -s "https://www.peptidepilot.me$u" | grep -c 'content="noindex'   # want 0
done
```

Local classifier confirms intent before deploy: group A all in `GONE_410_PATHS`; group B `isNoindexed()==true`; group C `isNoindexed()==false`.

---

## 4. Prerender route reconciliation

| Metric | Value | Expected |
|---|---|---|
| Prerender routes | **685** | 723 − 38 (28×410 + 10×301 losers) ✅ |
| 410 paths rendered | **0** | 0 ✅ |
| 301 losers rendered | **0** | 0 ✅ |
| noindex present & flagged | **301 / 301** | all flagged ✅ |
| Sitemap-eligible (non-noindex) | **389** | — |

410/301 pages are excluded from the render set (real server responses handle them); the 301 noindex-flagged keepers still render but carry the noindex meta.

---

## 5. Melanotan-2 melanoma-lede test (ship-gate)

- **H1:** "Melanotan-2: What It Is, the Evidence, and the Serious Risks" — risk-first ✅
- HowTo JSON-LD **suppressed** (`steps=[]`) — no how-to rich result for an unapproved injectable ✅
- Renders: Overview → **The risks** (4 amber bullets, melanoma/unapproved lede) → FAQ. No dosing steps, no "what you need" shopping list ✅
- **Verdict:** reads as an evidence/risk explainer, not a disclaimed usage guide → **stays indexed (KEEP)**. Not flipped to noindex.

---

## 6. Fable guide-steps invariant (Blocker-2 conditional)

- Total guides: **107** · with steps: **106** · step-less: **1** (`how-to-use-melanotan-2`).
- The `steps.length>0` conditional therefore affects **exactly one** guide (melanotan-2). All **106** step-bearing guides render HowTo + steps **unchanged**. ✅
- The conditional touches only the step-less guide, as required.

---

## 7. Deferred / flagged (not blockers)

- **FAQPage porting** to the 2 non-beachhead blog winners (`ipamorelin-vs-sermorelin`, `bpc-157-vs-tb-500`) is **deferred** — no approved structured FAQ exists for them; not fabricating claims.
- **2 non-winner markdown tables** (`peptides-vs-steroids`, `peptide-clinic-near-me`) left as raw markdown — out of scope (not cannibal winners).
- **tsc baseline (18, pre-existing):** `compression` missing @types, `server/_core/index.ts:259` seed-insert overload, `server/routers/quiz.ts` (4), `src/data/batch4*` / `src/lib/seo/batch4*` dead-import files, admin `.ts` pages. None in files I changed.

---

## Deploy checklist (on approval — per AGENTS.md)
1. Merge `seo-repair-pass` → deploy branch; Railway rebuild (static pages regenerate with $179 floor + prune set).
2. Watch boot log for `[ProviderFloor]` — halt if drift warned.
3. **Purge Cloudflare** (HTML is `max-age=0, must-revalidate`).
4. Run the §3 15-URL matrix with plain curl. All three groups must pass.
5. Post-deploy winner-watch (per SEO-REPAIR-REPORT): confirm 301'd empty-compare twins funnel to blog winners; watch melanotan-2 impressions.
