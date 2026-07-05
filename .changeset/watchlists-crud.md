---
"@aioi/database": minor
"@aioi/api": minor
"@aioi/validation": minor
---

Watchlists CRUD (B-016): org-scoped watchlist/item repository (`withOrgContext`), a `watchlists` tRPC
router (protected + RBAC `watchlists:read`/`:write`), shared Zod schemas, and RLS on `WatchlistItem`
(EXISTS-via-parent policy). Cross-tenant isolation for watchlists and items proven by integration tests.
