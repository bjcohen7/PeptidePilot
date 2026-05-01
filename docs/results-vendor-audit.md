# Results Page Vendor Audit

Date: May 1, 2026
Owner: Codex PR-0
Status: Ready for review

## Purpose

This document is the vendor/data audit for the upcoming PeptidePilot results-page redesign.

It exists to keep the build honest before UI work begins:

- prototype is the source of truth for layout and interaction intent
- the existing PeptidePilot app is the source of truth for route behavior, returning-session handling, analytics plumbing, and affiliate data access
- the redesigned `/results` page will be fully ungated and optimized for minimal friction

## Locked V1 Vendor Set

Assumption for this audit: the locked V1 vendor set is the full partner universe currently referenced in the repo on May 1, 2026.

1. Peptide Sciences
2. Core Peptides
3. Hone Health
4. LifeMD
5. Limitless Life
6. Paradigm Peptides
7. Defy Medical
8. Cosmic Nootropic
9. Amino Asylum
10. Tonik

## Current App Reality

Today the app has:

- raw affiliate links in `affiliate_links`
- basic partner records in `affiliate_partners`
- legacy vendor references embedded in `shared/scoring.ts` and `shared/pseoData.ts`

Today the app does **not** have a rich vendor presentation layer for:

- seller logos
- price bands
- promo callouts
- ratings
- shipping metadata
- vendor badges or proof points

That means V1 should only render fields that are real and verified, and hide everything else gracefully.

## Source-of-Truth Notes

### Existing app

- Keep the existing `/results` route and returning-token/session plumbing.
- Do **not** rebuild the route contract around `?quiz=<quizId>`.
- Preserve the existing affiliate click tracking path.

### Prototype / redesign

- Use the prototype as the source of truth for layout, hierarchy, mobile behavior, and interaction design.
- The results page should remain fully ungated: no email wall, no modal, no blurred content, no blocked vendor cards, and no blocked outbound clicks.

## Vendor x Field Matrix

Legend:

- `Yes` = field exists today in app data or was verified publicly
- `Partial` = field exists in some form but needs normalization or manual confirmation
- `No` = not currently available
- `Fallback` = render only via safe fallback (for example initials instead of a logo)

| Vendor | Category | Repo coverage today | Official landing URL to use | Logo | Price / promo | Ratings / shipping | V1 handling |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Peptide Sciences | Research peptides | Referenced in scoring and pSEO, not seeded in `affiliate_partners` | Needs business confirmation; code still points at legacy domain while indexed public domains have changed | Fallback | No | No | Keep in V1 set, use fallback mark until business confirms canonical domain and logo |
| Core Peptides | Research peptides | Referenced in scoring, pSEO, and current code URLs | `https://www.corepeptides.com` | Fallback | No | No | Keep in V1 set, use fallback mark, hide unsupported fields |
| Hone Health | Telehealth | Seeded in `affiliate_partners`, used in scoring and pSEO | `https://honehealth.com` | Yes | Partial | No | Use verified logo asset and real public pricing copy only if normalized into app data later |
| LifeMD | Telehealth | Seeded in `affiliate_partners`, used in scoring and pSEO | `https://www.lifemd.com` | Yes | Partial | No | Use verified logo asset and hide unsupported comparison fields |
| Limitless Life | Research peptides | Referenced in scoring and pSEO, not seeded in `affiliate_partners` | `https://limitlesslifenootropics.com` | Partial | No | No | Keep in V1 set, normalize brand naming, and ship with fallback until the hosted logo path is localized cleanly |
| Paradigm Peptides | Research peptides | Referenced in scoring only | Public search result points at `https://paradigmpeptidesstore.com` but business confirmation needed | Fallback | No | No | Keep in V1 set, fallback mark only until canonical domain is confirmed |
| Defy Medical | Telehealth | Referenced in scoring and pSEO | `https://defymedical.com` | Fallback | No | No | Keep in V1 set, fallback mark until clean asset sourcing is available |
| Cosmic Nootropic | Research / nootropics | Referenced in scoring and pSEO | `https://go.cosmicnootropic.com/` surfaced publicly; canonical marketing domain should be confirmed | Partial | No | No | Keep in V1 set, likely fallback in first pass unless clean logo asset is captured |
| Amino Asylum | Research peptides | Referenced in pSEO only | Code points at `https://aminoasylum.shop`, which currently redirects away publicly | Fallback | No | No | Keep name in matrix, but treat vendor as manual-review before card inclusion |
| Tonik | Telehealth | Referenced in pSEO via affiliate tracking URLs only | `https://www.tonikwellness.com/` | Partial | Partial | No | Keep in V1 set, normalize tracked offer URLs separately from brand presentation |

## Publicly Verified Price / Promo Signals

These were visible on public pages and are useful as future enrichment targets, but they are **not** structured in the app yet.

- Hone Health:
  - Basic membership: `$25/month`
  - Premium membership: `$149/month`
  - Starter test + consult CTA: `$65`
- LifeMD:
  - Wegovy access language: `starting at just $149`
  - public GLP-1 program copy and insurance messaging
- Tonik:
  - public semaglutide / tirzepatide pricing grid visible on the weight-loss landing page

These should not be rendered in V1 until they are captured in structured app data.

## Publicly Verified Logo Asset Status

### Verified public assets

- Hone Health
  - public JSON-LD references a logo asset on `honehealth.com`
  - localized in repo at `/client/public/partner-logos/hone-health.png`
- LifeMD
  - public site references `https://www.lifemd.com/css/img/logo.svg`
  - localized in repo at `/client/public/partner-logos/lifemd.svg`
- Limitless Life
  - public storefront references a usable hosted logo asset, but the exact CDN path still needs a clean follow-up capture before localization

### Manual-review / fallback-first vendors

- Peptide Sciences
- Core Peptides
- Paradigm Peptides
- Defy Medical
- Cosmic Nootropic
- Amino Asylum
- Tonik

For these vendors, V1 should be prepared to render fallback marks until a clean official asset is captured.

## Required V1 Graceful Hiding Rules

The redesign must never fabricate missing vendor fields.

If a field does not exist in normalized app data:

- logo -> use fallback mark
- price -> hide
- promo -> hide
- rating -> hide
- shipping -> hide
- badge -> hide

No placeholder text like `TBD`, `coming soon`, or fake review numbers should appear on the user-facing results page.

## Recommended Build Sequence

1. PR-0: vendor audit and vendor presentation schema
2. PR-1: introduce vendor presentation layer and optional logo assets
3. PR-2: port redesign layout into existing React results route
4. PR-3: wire vendor cards, stacks, sorting, and outbound CTA behavior against real app data

## Not In This Work

To prevent scope creep, the following are explicitly out of scope for this pass:

- rebuilding route contracts around `?quiz=<quizId>`
- reintroducing any email gate
- vendor-type tabs
- refetching on focus-chip changes
- new admin tooling for promo management
- fabricated ratings, shipping speeds, or discounts
- expanding the vendor set beyond the locked V1 list
