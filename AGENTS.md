# Build constraints

- Never swallow database errors — catch blocks must log `err.cause` and the full driver error (`err.code`, `err.errno`, `err.sqlState`, `err.sqlMessage`, `err.cause?.message`, `err.cause?.code`, `err.cause?.sqlMessage`).
- New tables must declare charset/collation matching the existing `leads` table (`utf8mb4_0900_ai_ci`). Declare it explicitly on every `CREATE TABLE` (`ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`) — MySQL's server/schema default differs, and a mismatch breaks `JOIN`s on `varchar` keys (e.g. `email_queue.lead_id = leads.id`) with an "illegal mix of collations" error.
- The `providers` table uses snake_case columns (`display_name`, `price_from_cents`, `ship_days_estimate`, `promo_code`, `compliance_note`). Alias them when a caller expects camelCase; selecting the camelCase names directly throws `ER_BAD_FIELD_ERROR`.

# Provider pricing on static pages

- The "from $X/mo" floor shown in CTAs and prerendered content comes from `PROVIDER_FLOOR_PRICE` in `shared/providerData.ts` (`Math.min` of `startingPrice`), NOT a hardcoded literal. It mirrors the DB `providers.price_from_cents`. A server-startup check logs a loud `[ProviderFloor]` warning if the constant drifts from the live table.
- **A price change requires a rebuild + redeploy** to reflect on static/prerendered pages — updating only the DB row will not change already-prerendered HTML. Update `shared/providerData.ts` (and the DB row) together, then rebuild.

# Verification probes on prod tracking tables

- When smoke-testing a tracking write against production (e.g. curling `/go-direct/gala` to confirm a `provider_click_logs` row lands), use a **sentinel-prefixed session id** — `sid=test-…` — never a bare UUID. Real visitor sessions are `crypto.randomUUID()` UUIDs, so a UUID probe is indistinguishable from a real row and can't be cleaned up mechanically. A `test-` prefix makes cleanup a single `DELETE … WHERE public_id LIKE 'test-%'` instead of an enumerated kill-list.

# OG / social-card compliance (drug-class-free)

- The **OG layer** — `og:title`, `og:description`, `og:image` (+ pixels/alt), and the `twitter:*` equivalents — must be **drug-class-free** for the **sitewide defaults (`client/index.html`), `/`, and `/start`** (the ad-adjacent routes Meta renders link-preview cards from). No `GLP-1`, `semaglutide`, `tirzepatide`, `Ozempic`, `Wegovy`, `Zepbound`, `Mounjaro` in those fields/pixels. Use compliant framing, e.g. "Medically-supervised weight management from licensed US clinicians."
- **On-page SEO keeps clinical terms:** `<title>` tags and body/structured content may keep `GLP-1` etc. — Google reads those; Meta's scraper does not. So `<title>` ≠ `og:title` is intentional. `og:title`/`twitter:title` come from `PrerenderRoute.ogTitle` (falls back to `title`) in `scripts/prerender-routes.ts`; `injectHead` (`scripts/prerender.tsx`) does NOT override `og:image` per-route, so the shared image is whatever `client/index.html` declares.
- **Blog / pSEO / comparison pages MAY keep clinical og text** for organic sharing — they're out of the hard requirement. Don't sweep them drug-free without an explicit call.
- The compliant OG image lives at **`/og/default.png`** (`client/public/og/default.png`, 1200×630) — keep `og:image:width`/`height` tags correct. After any OG change: deploy, purge Cloudflare, then re-scrape both URLs in the **FB Sharing Debugger** so Meta drops the cached card.

# Deploy verification (Cloudflare cache)

- `https://www.peptidepilot.me` sits behind Cloudflare's cache. After any deploy that changes HTML, verify prod **without** cache-busters — a plain `curl https://www.peptidepilot.me/` (no `?cb=...`) — and **purge the Cloudflare cache if stale**. Cache-busted curls hit the origin and do NOT prove what users see.
- Origin cache policy (set in `server/_core/vite.ts`): prerendered/SPA-shell **HTML** is served `Cache-Control: public, max-age=0, must-revalidate` (revalidate every request so a deploy is never masked); **hashed static assets** (`/assets/*.[hash].js|css`) are `max-age=31536000, immutable`. Do not make HTML long-cacheable.
