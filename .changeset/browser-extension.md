---
"@aioi/extension": minor
"@aioi/web": minor
---

Browser extension (M15-C / ADR-0007). A new `apps/extension` — a Manifest V3 popup that puts the AI
**"build now" opportunities** in your toolbar, over the existing deployed public API.

- **`apps/extension`** (MV3, built with **esbuild**): a popup that lists `/api/v1/opportunities` and a
  search box over the public API; results deep-link to the web app. Configurable API base URL + optional
  API key (persisted in `localStorage`). No permissions/keys needed — the public API is CORS-open. Pure
  logic (URL building, response mapping) is unit-tested; wired into Turbo (build/typecheck/lint).
- **`GET /api/v1/search?q=`** — a public keyword-search route (reuses `searchTrends`), same
  envelope/auth/rate-limit as the other v1 routes; listed in the API index.

Verified: `/api/v1/search` returns data with CORS `*`; the extension builds to a valid MV3 `dist/`.
Content-script page recognition and Web Store submission are deferred to v2 (B-041).
