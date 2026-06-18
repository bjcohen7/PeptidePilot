# PeptidePilot Funnel Fixes

Code-mapped bugs, expected behavior, and fixes across the quiz interstitial and provider comparison pages.

---

## Fix 1 — "Now let's find your best price" Interstitial

### Bug A: Eyebrow text rendered inside 46×46px monogram box

**Where:** `client/src/pages/QuizFlow.tsx:153`

```tsx
{step.interEyebrow && <span className="pp-mono" style={{ ... }}>{step.interEyebrow}</span>}
```

**Why it breaks:** The `pp-mono` class (`client/src/index.css:304-310`) is a fixed-size monogram badge intended for provider initials ("GA", "DM", "SP"):

```css
.pp-mono {
  width: 46px; height: 46px; border-radius: 13px;
  background: var(--grad-cta); display: grid; place-items: center;
  ...
}
```

The eyebrow text "Nice — that helps" is squeezed into a 46×46px box with a gradient background, clipping the text and showing an unwanted colored box. The step icon (checkmark above it) already handles visual branding — the eyebrow should be plain text with no box constraints.

**Expected:** The eyebrow renders as a plain text label — small, uppercase, letter-spaced, no background box.

**Fix:** Replace `className="pp-mono"` with `className="pp-eyebrow"` (the class designed for this purpose at `index.css:241-248`):

```diff
- <span className="pp-mono" style={{ color: "var(--sky-deep)", fontSize: ".72rem", letterSpacing: ".16em", textTransform: "uppercase", fontWeight: 600, display: "block", marginBottom: 18 }}>
+ <span className="pp-eyebrow" style={{ marginBottom: 18 }}>
```

The `pp-eyebrow` class provides the correct monospace, uppercase, letter-spaced styling with a decorative dash prefix — no box, no background, no width/height constraints.

### Bug B: Header logo container has unnecessary font/gap styles that may shift wordmark

**Where:** `client/src/components/Navbar.tsx:48-49`

```tsx
<Link href="/" className="flex items-center gap-[10px] no-underline"
  style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: "1.2rem", color: "var(--ink)" }}>
  <PeptidePilotLogo height={30} variant="dark" />
</Link>
```

**Why it breaks:** The `<Link>` wrapper adds `gap-[10px]` and explicit font styles that serve no purpose (PeptidePilotLogo manages its own inline-flex layout internally). The `gap-[10px]` applies spacing between flex children — if PeptidePilotLogo renders as multiple internal children, the parent gap adds unexpected 10px spacing between the icon and wordmark. On constrained viewports this can push the wordmark out of the visible area or cause it to wrap.

**Expected:** The logo wrapper should be a plain inline/b lock link with no extraneous flex layout or font styling.

**Fix:** Remove the extra flex, gap, and font styles from the `<Link>`:

```diff
- <Link href="/" className="flex items-center gap-[10px] no-underline"
-   style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: "1.2rem", color: "var(--ink)" }}>
+ <Link href="/" className="no-underline">
    <PeptidePilotLogo height={30} variant="dark" />
  </Link>
```

---

## Fix 2 — "Your match is ready" Interstitial

### Bug: Same eyebrow-in-a-box as Fix 1

**Where:** `client/src/pages/QuizFlow.tsx:153` (shared rendering code — same line, same component, same bug)

The second interstitial (step index 8, line 31) uses the identical `pp-mono` class for its eyebrow text "All set". Same 46×46px box constraints, same unwanted gradient background, same clipping.

**Expected:** "All set" renders as a plain uppercase label, no box.

**Fix:** Same as Fix 1A — change `className="pp-mono"` to `className="pp-eyebrow"` in the shared render path at `QuizFlow.tsx:153`. This fixes both interstitials in one edit.

---

## Fix 3 — `/providers` Comparison Page

### Bug A: 3-month plan savings are hardcoded and wrong

**Where:** `client/src/pages/ProvidersPage.tsx:15-19`

```tsx
const MOCK_PLAN_PRICES: Record<string, { price: string; save: string }> = {
  gala: { price: "$89", save: "save 10%" },      // actual save ≈ 50%
  direct_med: { price: "$109", save: "save 16%" },  // actual save ≈ 45%
  sprout: { price: "$129", save: "save 13%" },       // actual save ≈ 35%
};
```

**Why it breaks:** The `save` strings are hardcoded and wrong. Actual savings vs monthly price:

| Provider | Monthly | 3-mo | True save | Displayed |
|----------|---------|------|-----------|-----------|
| Gala     | $179    | $89  | 50%       | 10%       |
| Direct Med | $199  | $109 | 45%       | 16%       |
| Sprout   | $199    | $129 | 35%       | 13%       |

The displayed "save 10%" significantly under-represents the actual discount, making the 3-month plan look less compelling than it is.

**Expected:** Savings percentage is computed from `(startingPrice - planPrice) / startingPrice` and shown as `"save {pct}%"`.

**Fix:** Replace hardcoded strings with computed values. Either add a `planPrice` field to `providerData.ts` and compute in the component, or embed a `savePct` directly in `MOCK_PLAN_PRICES` with correct values:

```diff
const MOCK_PLAN_PRICES: Record<string, { price: string; save: string }> = {
- gala: { price: "$89", save: "save 10%" },
+ gala: { price: "$89", save: "save 50%" },
- direct_med: { price: "$109", save: "save 16%" },
+ direct_med: { price: "$109", save: "save 45%" },
- sprout: { price: "$129", save: "save 13%" },
+ sprout: { price: "$129", save: "save 35%" },
};
```

### Bug B: Provider name "Gala" displayed without brand qualifier

**Where:**
- `shared/providerData.ts:32` — `name: "Gala"`
- `client/src/pages/ProvidersPage.tsx:187` — `{p.name}` in desktop table header
- `client/src/pages/ProvidersPage.tsx:339` — `{p.name}` in mobile card

**Why it breaks:** The provider data labels the first provider as just "Gala" but the brand is "Gala Health" on their site and affiliate landing pages. Similarly, "Direct Med" is "Direct Meds" (providerData.ts:56 says "Direct Med" but official site is directmeds.com).

**Expected:** Provider names in data match their brand identities:
- `gala` → `"Gala Health"`
- `direct_med` → `"Direct Meds"`

**Fix:** Update names in `shared/providerData.ts:32,56`:

```diff
- name: "Gala",
+ name: "Gala Health",
```

```diff
- name: "Direct Med",
+ name: "Direct Meds",
```

Also add `white-space: nowrap` to the name display at `ProvidersPage.tsx:187` to prevent wrapping on narrow screens:

```diff
- {p.name}
+ <span style={{ whiteSpace: "nowrap" }}>{p.name}</span>
```

### Bug C: Top-pick badge may clip at table header boundary

**Where:** `client/src/pages/ProvidersPage.tsx:175-183`

```tsx
{p.id === FEATURED_PROVIDER_ID && (
  <span className="toppick" style={{
    position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)",
    background: "var(--mint-deep)", color: "#fff", fontSize: ".62rem",
    fontWeight: 700, letterSpacing: ".07em", padding: "4px 13px",
    borderRadius: 999, whiteSpace: "nowrap"
  }}>
    ★ Top pick · best value
  </span>
)}
```

**Why it breaks:** The badge is positioned absolutely with `top: -11` relative to the `<th>`. If the `<th>` has `overflow: hidden` (or inherits it from a parent), the badge will be clipped at the top edge. The parent table or container may clip the protruding portion.

**Expected:** The badge sits fully visible above the featured provider column, extending past the table header top border.

**Fix:** Ensure the parent `<th>` (line 170-174) has `overflow: visible`:

```diff
<th key={p.id} style={p.id === FEATURED_PROVIDER_ID ? {
  borderTop: "3px solid var(--mint-deep)",
  position: "relative",
  paddingTop: 22,
+ overflow: "visible",
} : {}}>
```

### Bug D: Featured CTA uses flat solid green instead of gradient

**Where:**
- `client/src/pages/ProvidersPage.tsx:292-293` (desktop table)
- `client/src/pages/ProvidersPage.tsx:389` (mobile cards)

```tsx
background: p.id === FEATURED_PROVIDER_ID ? "var(--mint-deep)" : "var(--secondary)",
```

**Why it breaks:** The featured provider's "Get started →" button uses flat `var(--mint-deep)` (solid emerald) instead of the site's signature gradient `var(--grad-cta)` (teal→sky). This breaks visual consistency — the gradient is PeptidePilot's primary brand CTA treatment used across the quiz, homepage, and nav. A flat green button looks like a generic third-party element.

**Expected:** The featured CTA uses the brand gradient (`var(--grad-cta)`) consistent with every other primary CTA on the site.

**Fix:** Replace `var(--mint-deep)` with `var(--grad-cta)` in the featured CTA background, and ensure text remains readable on the gradient:

```diff
- background: p.id === FEATURED_PROVIDER_ID ? "var(--mint-deep)" : "var(--secondary)",
- color: p.id === FEATURED_PROVIDER_ID ? "#fff" : "var(--ink)",
+ background: p.id === FEATURED_PROVIDER_ID ? "var(--grad-cta)" : "var(--secondary)",
+ color: p.id === FEATURED_PROVIDER_ID ? "var(--ink)" : "var(--ink)",
```

Same change at mobile CTA (line 389-390).

### Bug E: Section heading may clip on narrow viewports

**Where:** `client/src/pages/ProvidersPage.tsx:148-152`

```tsx
<div className="text-center mb-6" style={{ maxWidth: 680, margin: "0 auto 18px" }}>
  <span className="pp-eyebrow" style={{ justifyContent: "center", margin: "0 auto 12px" }}>Matched to you</span>
  <h2 style={{ fontSize: "1.9rem", marginBottom: 8 }}>
    Your {providers.length} trusted providers
  </h2>
  <p className="text-sm" style={{ color: "var(--muted)" }}>
    Compounded semaglutide · ships to New York · sorted by best value.
  </p>
</div>
```

**Why it breaks:** On mobile screens (< 400px), the heading text "Your 3 trusted providers" at `fontSize: "1.9rem"` can overflow the `maxWidth: 680` container if the text is wider than the viewport less padding. The container itself doesn't have `overflow: hidden`, but the heading text can break layout by forcing the parent wider or getting clipped by parent overflow.

**Expected:** Heading wraps naturally on small screens without overflow.

**Fix:** Add responsive font sizing and ensure the parent doesn't constrain overflow:

```diff
- <h2 style={{ fontSize: "1.9rem", marginBottom: 8 }}>
+ <h2 style={{ fontSize: "clamp(1.3rem, 5vw, 1.9rem)", marginBottom: 8 }}>
```

---

## Priority Order

1. **Fix 1A + Fix 2** — Eyebrow-in-a-box (wrong class on both interstitials). This is the most visible bug — a broken colored box with clipped text appears mid-quiz. One-line fix at `QuizFlow.tsx:153`.

2. **Fix 3D** — Flat green CTA should be gradient. Makes the primary action button look foreign. Two edits in `ProvidersPage.tsx:292-293,389`.

3. **Fix 3A** — Wrong savings percentages. Misleads visitors about 3-month plan value. Data change in `ProvidersPage.tsx:16-18`.

4. **Fix 3B** — Provider name without brand qualifier + no wrapping guard. Two data changes + one JSX change in `providerData.ts:32,56` and `ProvidersPage.tsx:187`.

5. **Fix 3C** — Top-pick badge overflow. One CSS property add in `ProvidersPage.tsx:170-174`.

6. **Fix 1B** — Logo wrapper extra styles. Cleanup in `Navbar.tsx:48`.

7. **Fix 3E** — Heading sizing on mobile. One CSS change in `ProvidersPage.tsx:149`.
