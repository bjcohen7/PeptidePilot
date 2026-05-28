# GLP-1 Bridge Page — Implementation Plan

## What
When quiz result is GLP-1 (`peptideId === "semaglutide"`), show an educational bridge page instead of the affiliate cards. CTA toggles to the existing cards view.

## Files to create
```
client/src/components/bridge/
  ├── Glp1BridgePage.tsx          # page shell + all sections
  └── StickySkipButton.tsx        # floating fixed CTA
```

## Files to modify
1. `client/src/pages/Results.tsx` — add `showBridge` state, conditionally render bridge vs commerce page
2. `client/src/App.tsx` — add `/results/glp1` route (lazy-loaded, noindex)
3. `client/src/AppPrerender.tsx` — add minimal placeholder route

## Glp1BridgePage.tsx sections (11 total, copy from Option A tab of HTML)
1. Hero — "YOUR RESULTS ARE READY" eyebrow, H1, sub text
2. MatchBreakdown — 92% card (GLP-1) + 64% card (peptide support)
3. ScienceSection — 3-column mechanism grid (appetite/gastric/insulin) + `/learn` link (#)
4. ResearchSection — 3 stat rows (15%, 20%, 5+ yrs) + quad stat block + `/learn` link
5. CompareSection — Semaglutide vs Tirzepatide side-by-side + `/learn` link
6. TimelineSection — 4 numbered steps week-by-week + `/learn` link
7. Testimonials — 4 cards (S.R./M.K./D.L./J.P.) + FTC disclaimer + `/learn` link
8. FAQSection — 5 items (prescription, legality, side effects, cost, stopping) + `/learn` link
9. SafetyNote — quality/safety callout
10. VetSection — 5-point checklist
11. FinalCTA — gradient button "View your matched GLP-1 providers →"

## StickySkipButton.tsx
- Fixed bottom: 16px, max-width: 720px, centered pill
- Gradient `linear-gradient(135deg, #0fb88a, #22d3ee)`, text `#0e1f1c`
- `env(safe-area-inset-bottom)` for iOS
- Same CTA target as final button
- Page content needs `padding-bottom: 120px`

## Results.tsx wiring
```tsx
const [showBridge, setShowBridge] = useState(
  selectedMatch?.peptideId === "semaglutide"
);

// Before render:
if (showBridge && selectedMatch) {
  return <Glp1BridgePage
    matchName={selectedMatch.name}
    matchPercent={selectedMatch.matchPercent}
    onSkipToProviders={() => setShowBridge(false)}
  />;
}
```

## Design tokens (hardcoded hex — same pattern as existing ResultsCommercePage)
- bg: `#f6f8f7`, surface: `#ffffff`, border: `#e2e8e5`
- ink: `#0e1f1c`, muted: `#4a5b58`, soft: `#8a939b`
- teal: `#0a6b54`, mint tint: `#e6f7f1`
- accent gradient: `linear-gradient(135deg, #0fb88a, #22d3ee)`
- dark block bg: `#0a1815`

## Mobile breakpoints
- 640px: grids → 1 column, section padding 28→18px, hero 34→26px
- 380px: hero → 23px

## `/learn` link placeholders
All 6 link to `#` with TODO comments. The `/learn` route exists in the app but specific GLP-1 article pages may not.

## Not in scope
- Building/modifying affiliate cards (v4 exists)
- Quiz/scoring logic
- `/learn` article pages
- Email capture changes
