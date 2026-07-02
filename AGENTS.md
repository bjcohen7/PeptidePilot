# Build constraints

- Never swallow database errors — catch blocks must log `err.cause` and the full driver error (`err.code`, `err.errno`, `err.sqlState`, `err.sqlMessage`, `err.cause?.message`, `err.cause?.code`, `err.cause?.sqlMessage`).
- New tables must declare charset/collation matching the existing `leads` table (`utf8mb4_0900_ai_ci`). Declare it explicitly on every `CREATE TABLE` (`ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`) — MySQL's server/schema default differs, and a mismatch breaks `JOIN`s on `varchar` keys (e.g. `email_queue.lead_id = leads.id`) with an "illegal mix of collations" error.
- The `providers` table uses snake_case columns (`display_name`, `price_from_cents`, `ship_days_estimate`, `promo_code`, `compliance_note`). Alias them when a caller expects camelCase; selecting the camelCase names directly throws `ER_BAD_FIELD_ERROR`.

# Deploy verification (Cloudflare cache)

- `https://www.peptidepilot.me` sits behind Cloudflare's cache. After any deploy that changes HTML, verify prod **without** cache-busters — a plain `curl https://www.peptidepilot.me/` (no `?cb=...`) — and **purge the Cloudflare cache if stale**. Cache-busted curls hit the origin and do NOT prove what users see.
- Origin cache policy (set in `server/_core/vite.ts`): prerendered/SPA-shell **HTML** is served `Cache-Control: public, max-age=0, must-revalidate` (revalidate every request so a deploy is never masked); **hashed static assets** (`/assets/*.[hash].js|css`) are `max-age=31536000, immutable`. Do not make HTML long-cacheable.
