# Build constraints

- Never swallow database errors — catch blocks must log `err.cause` and the full driver error (`err.code`, `err.errno`, `err.sqlState`, `err.sqlMessage`, `err.cause?.message`, `err.cause?.code`, `err.cause?.sqlMessage`).
- New tables must declare charset/collation matching the existing `leads` table (`utf8mb4_0900_ai_ci`). Declare it explicitly on every `CREATE TABLE` (`ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`) — MySQL's server/schema default differs, and a mismatch breaks `JOIN`s on `varchar` keys (e.g. `email_queue.lead_id = leads.id`) with an "illegal mix of collations" error.
- The `providers` table uses snake_case columns (`display_name`, `price_from_cents`, `ship_days_estimate`, `promo_code`, `compliance_note`). Alias them when a caller expects camelCase; selecting the camelCase names directly throws `ER_BAD_FIELD_ERROR`.
