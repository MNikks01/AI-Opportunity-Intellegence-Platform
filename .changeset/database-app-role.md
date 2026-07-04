---
"@aioi/database": patch
---

Runtime connects as a restricted `aioi_app` role via `APP_DATABASE_URL` so RLS enforces (superusers
bypass it). Migration creates the NOSUPERUSER NOBYPASSRLS role with grants; the client falls back to
`DATABASE_URL` when `APP_DATABASE_URL` is unset (ADR-0003 / B-027).
