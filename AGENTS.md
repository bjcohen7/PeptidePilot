# Build constraints

- Never swallow database errors — catch blocks must log `err.cause` and the full driver error (`err.code`, `err.errno`, `err.sqlState`, `err.sqlMessage`, `err.cause?.message`, `err.cause?.code`, `err.cause?.sqlMessage`).
- New tables must declare charset/collation matching the existing `leads` table (`utf8mb4_unicode_ci`).
