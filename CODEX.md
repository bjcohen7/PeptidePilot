# PeptidePilot — Project Context for AI Coding Agents

## Stack
- **Frontend**: React + Vite + Tailwind CSS v4 (`@import "tailwindcss"`), tRPC client
- **Backend**: Express + tRPC server, Drizzle ORM + PlanetScale MySQL
- **Build**: `pnpm run build` (node v24 via nvm)
- **Deploy**: Railway — auto-deploys from `main` branch on push

## Structure
```
PeptidePilot/
├── client/src/          # React app (Vite)
│   ├── pages/           # Route pages (NewResultsPage, QuizEntry, QuizFlow, etc.)
│   ├── components/      # Shared components
│   ├── contexts/        # React contexts (QuizContext)
│   ├── lib/             # Utilities (trpc, metaPixel, preloadQuiz)
│   └── index.css        # Tailwind v4 imports + custom CSS (no PostCSS config)
├── server/              # Express + tRPC server
│   └── routers/         # tRPC routers (quiz.ts, affiliates.ts, admin.ts, etc.)
├── shared/              # Types/logic shared between client + server
│   ├── scoring.ts       # Quiz questions, peptide profiles, scoring engine
│   ├── providerData.ts  # GLP-1 provider data (Direct Meds, SkinnyRX, Medvi)
│   └── affiliatePartners.ts  # Seed data for affiliate partners
├── drizzle/
│   └── schema.ts        # Drizzle ORM schema (all DB tables)
└── scripts/
    └── build.mjs        # Custom build script (static export + prerender + server bundle)
```

## Key Pages & Their Files
| Route | File | Purpose |
|-------|------|---------|
| `/` | `client/src/pages/HomePage.tsx` | Landing page |
| `/quiz` | `client/src/pages/QuizEntry.tsx` | Quiz intro |
| `/quiz/flow` | `client/src/pages/QuizFlow.tsx` | Quiz questions (22 Qs, multi/single select) |
| `/processing` | `client/src/pages/QuizProcessing.tsx` | Loading screen (1.5s auto-redirect) |
| `/results` | `client/src/pages/NewResultsPage.tsx` | Results comparison page (687 lines) |
| `/admin/affiliates` | `client/src/pages/admin/AffiliatePartners.tsx` | Manage affiliate links |
| `/admin/insights` | `client/src/pages/admin/InsightsOverview.tsx` | Conversion funnel analytics |

## Critical Conventions
- **Don't change hardcoded copy strings** — use exact text from specs
- **Affiliate links** come from DB via `trpc.affiliates.activeLinksByPeptide` — hardcoded `affiliateUrl` is fallback only
- **Multi-select quiz questions**: indices `[13, 15, 16]` (Q14, Q16, Q17) — use `.option-card--compact` CSS class
- **Quiz entry page**: has mobile fold constraint (iPhone 17 Pro 430×932, ~800px visible) — keep START button above fold
- **Results page**: 11 sections, mobile-first, `lg:` (1024px) breakpoint for desktop, max-content-width 1120px
- **Analytics events**: 5 Meta Pixel events on results page (`results_page_viewed`, `results_provider_clicked`, `results_faq_viewed`, `results_restart_clicked`, `results_disclosure_clicked`)
- **OG image**: versioned (`og-image-v2.png`), updated meta tags in `index.html` and `Seo.tsx`
- **GLP-1 providers**: Direct Meds (featured), SkinnyRX, Medvi — defined in `shared/providerData.ts`
- **No paid placements** — providers sorted by fit, not commission

## File Patterns
- `shared/` files use `../../../shared/` imports from `client/src/` and `../../shared/` from `server/`
- Tailwind classes use arbitrary values with `[]` syntax (e.g., `px-[18px]`, `text-[#0e1f1c]`)
- `gap-*` for spacing, `flex`/`grid` for layout
- tRPC client: `import { trpc } from "@/lib/trpc"`
- Quiz state: `import { useQuiz } from "@/contexts/QuizContext"`

## Multi-Select Question Definition (QuizFlow.tsx)
```typescript
// Indices of multi-select questions (0-indexed)
const MULTI_SELECT_INDICES = new Set([13, 15, 16]); // Q14, Q16, Q17
const TOP_TWO_INDEX = 19; // Q20
```

## Affiliate Link System
- DB tables: `affiliate_partners`, `affiliate_links`, `affiliate_clicks`
- tRPC router: `server/routers/affiliates.ts`
- Public query: `trpc.affiliates.activeLinksByPeptide({ peptideId })`
- Admin UI: `/admin/affiliates`
- Click tracking: `trpc.quiz.trackAffiliateClick.mutate({ leadId, peptideId, vendor })`
