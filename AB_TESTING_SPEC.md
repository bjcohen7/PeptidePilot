# PeptidePilot — A/B Testing & Analytics Spec

## What We're Building

A system to run split tests on any page (landing, quiz, results, etc.), track every step of the funnel, and measure which variant performs best — all without third-party tools. Tests are created via the admin panel, variants are assigned server-side, and results are visible in real-time.

---

## How It Works

### 1. Experiment = Funnel Config

Each experiment has variants (control, variant_a, variant_b, etc.). Each variant defines its own funnel path as structured data:

```json
{
  "funnel": [
    { "step": "landing", "page": "/", "template": "hero-video" },
    { "step": "quiz", "page": "/quiz", "template": "questions-22" },
    { "step": "results", "page": "/results", "template": "6d-grid" }
  ],
  "copy": {
    "heroTitle": "Lose weight with GLP-1s",
    "heroSubtitle": "..."
  }
}
```

This means you can mix and match: landing A → quiz short → results compact, or landing B → quiz long → results detailed — without deploying new code.

### 2. Assignment (Server-Side)

When a user visits, they're assigned to a variant deterministically by hashing their session ID + experiment slug. The assignment is consistent across page reloads (no flicker). They see the same variant for the full session life.

### 3. Conditional Rendering

A React context (`ExperimentProvider`) fetches the user's assignments once per session. Components use a `useVariant()` hook to pick which template to render:

```tsx
function LandingHero() {
  const variant = useVariant("landing-hero-test");
  if (variant?.name === "variant_a") return <NewHero />;
  return <DefaultHero />;
}
```

### 4. Every Step Is Tracked

Events fire automatically at each funnel step — page view, quiz start, each question, quiz complete, results view, affiliate click. Every event includes the experiment ID and variant ID so we can attribute everything back to the variant that drove it.

### 5. Results Dashboard

For each experiment, the admin panel shows:

| Variant | Sessions | Quiz Start | Quiz Complete | Results View | Affiliate Click | Click Rate | vs Control |
|---------|----------|------------|---------------|--------------|-----------------|------------|------------|
| control | 1,024 | 612 (60%) | 487 (48%) | 453 (44%) | 89 (9%) | 8.7% | — |
| variant_a | 1,036 | 701 (68%) | 582 (56%) | 549 (53%) | 134 (13%) | 12.9% | +48% |

Plus funnel visualization, statistical significance, and CSV export.

---

## New Database Tables

| Table | Purpose |
|-------|---------|
| `experiments` | One row per test (name, slug, status, dates, hypothesis) |
| `experiment_variants` | One row per variant per experiment (name, traffic weight, JSON config) |
| `experiment_assignments` | Which session got which variant (one row per session per experiment) |
| `experiment_events` | Every tracked action with experiment context |

Plus columns added to existing tables (`page_visits`, `affiliate_clicks`) to include experiment ID + variant ID.

---

## What's Already in Place

PeptidePilot already has the tracking infrastructure:
- `visitor_sessions` — one per browser with landing page, referrer, UTM params
- `page_visits` — every page view
- `click_events` — every tracked click
- `affiliate_clicks` — provider clicks with lead ID
- `leads` — quiz completions with full answers

This system extends what exists instead of replacing it.

---

## Implementation Plan

**Phase 1 — Foundation (3-4 days)**
- Create the 4 new database tables
- Add experiment columns to existing tables
- Build the server-side assignment endpoint
- Build the React context + useVariant hook
- Wire session creation to auto-assign active experiments

**Phase 2 — Tracking & Funnel (2-3 days)**
- Auto-track every funnel step with experiment context
- Instrument quiz flow (question-level dropoff)
- Build the funnel SQL queries for the dashboard

**Phase 3 — Admin UI (3-4 days)**
- Experiment list page
- Create/edit experiment form (with funnel config editor)
- Results dashboard with funnel visualization + significance
- CSV export

---

## Key Design Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Assignment level | Session (not user) | No login required; cookie is stable enough |
| Assignment method | Server-side via tRPC | No flicker, consistent across reloads |
| Variant config | JSON column | No schema changes for each new test |
| Stats | Chi-squared + Bayesian | Quick glance + decision confidence |
| Event transport | Batched tRPC | No new infrastructure needed |
