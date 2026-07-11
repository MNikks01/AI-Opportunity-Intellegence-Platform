# ADR-0007 — Browser extension (MV3 popup over the public API)

- **Status:** Accepted
- **Date:** 2026-07-11
- **Deciders:** Architect, Frontend Engineer, Product
- **Context source:** M15 "browser extension" ([MILESTONES](../09-process/MILESTONES.md)),
  [ADR-0001](ADR-0001-core-stack.md), the public read API (`apps/web/app/api/v1`)

## Context

M15's distribution slice is a **browser extension** — put AI opportunity intelligence one click away
while you browse. The key question is what it depends on. We already ship a **deployed, public read
JSON API** as Next route handlers on Vercel (`/api/v1/opportunities`, `/api/v1/trends`,
`/api/v1/trends/{slug}`) with optional Bearer-key auth + rate limits. So the extension is largely a
**self-contained frontend** over an existing API — the main new thing is **build tooling** (a bundler),
which the Next/tsc monorepo doesn't yet have, plus a new app surface.

## Decision

### D1 — Manifest V3, reuse the existing public API — no bespoke backend

The extension calls the **existing** public API. It needs **no new server** beyond one convenience
endpoint (**D4**). MV3 (the current Chrome/Edge standard; Firefox-compatible) with a **popup** as the v1
surface. The extension declares `host_permissions` for the API origin, so the popup fetches cross-origin
from the privileged extension context (no CORS changes needed).

### D2 — v1 scope: a **popup** (opportunities + search), not a content script

- The popup shows the **"build now" opportunities** (`/api/v1/opportunities`) and a **search box** over
  the public API — each result deep-links to the web app.
- **Options:** a configurable **API base URL** (default the production site) and an **optional API key**
  (raises the rate limit; the same `aioi_…` keys created under Team).
- **Deferred to v2:** a **content script** that recognizes dev pages (GitHub repo / Hugging Face model)
  and shows AIOI's tracking for that entity — higher value but needs page-matching + entity lookup
  endpoints. Ship the popup first.

### D3 — Placement + build tooling: `apps/extension` built with **esbuild**

A new `apps/extension` workspace. Next.js can't build an extension, and tsc alone doesn't bundle, so we
add **esbuild** (tiny, zero-config, fast) — a single small bundler dependency scoped to this app. It
produces `dist/` (manifest + popup HTML/JS/CSS). Wired into Turbo for `typecheck`/`lint`/`build` so CI
covers it; the build emits a load-unpacked `dist/` (and a zip artifact) — **it must not break the
existing Next/tsc pipeline.**

### D4 — One new API route: `/api/v1/search`

Add a public `GET /api/v1/search?q=` route (mirrors the existing routes' auth + rate-limit + shape),
reusing `searchTrends` (keyword FTS). Listed in the `/api/v1` self-documenting index. This is the only
backend change.

### D5 — Distribution: **unpacked / zip artifact** in v1; store submission deferred

v1 ships a **load-unpacked** build + a zipped artifact for sideloading, with README steps. Chrome Web
Store / AMO submission (listings, review, privacy policy, publisher accounts) is **deferred** — it's an
ops/release decision, not an engineering blocker.

### D6 — No secrets, offline-friendly dev

The extension needs no keys to work (public opportunity data is public); an API key is optional. It
targets a configurable base URL, so it works against local (`localhost:3000`) or production. Nothing
about it affects keyless CI.

## Acceptance criteria (v1 = D1–D4)

1. **Search route:** `GET /api/v1/search?q=` returns matching trends with the same envelope/auth/limits
   as the other v1 routes; empty `q` → empty list; listed in the API index.
2. **Extension:** `apps/extension` builds via esbuild to a valid MV3 `dist/` (manifest V3, popup); a
   documented **load-unpacked** flow; typecheck + lint pass in CI; the build doesn't break `pnpm build`.
3. **Popup:** lists "build now" opportunities and searches the public API; results deep-link to the web
   app; graceful empty/error states; the API base + optional key are configurable and persisted.
4. **Tests:** the popup's **pure logic** (API URL building, response→view mapping, key/base handling) is
   unit-tested; the search route's behavior is covered (search fn already tested).
5. **Gate:** `pnpm format:check && lint && typecheck && test && build` green with **no keys**.

## Alternatives considered

- **A content script that annotates pages (v1).** Deferred to v2 — higher value but needs page-matching
  - entity-by-URL lookup endpoints; the popup delivers value now with far less surface.
- **Deploy the standalone Fastify API for the extension.** Unnecessary — the Next route handlers are
  already deployed and sufficient; adding a second deployed API is cost we don't need.
- **A heavier extension framework (WXT/Plasmo).** Rejected for v1 — esbuild + a hand-written MV3 manifest
  keeps the dependency footprint tiny and the build transparent, matching the repo's "simplicity first."
- **Vite instead of esbuild.** Either works; esbuild is lighter for a single popup bundle. Revisit if the
  extension grows (options page, content scripts, HMR).

## Consequences

- **Positive:** a distribution surface that reuses the deployed public API and the existing keys; tiny
  new dependency (esbuild); no secrets; works against any base URL.
- **Negative / cost:** a **new build tool + app type** in the monorepo (esbuild alongside Next/tsc); the
  extension itself can't be meaningfully unit-tested in the vitest setup (no extension harness) —
  verified by building the bundle + testing the pure logic + manual load-unpacked; **store submission**
  is a separate, later effort.
- **Follow-ups:** v2 content-script page recognition (needs entity-by-URL endpoints); Web Store / AMO
  publishing; optional watch/alert actions from the popup.

## Proposed backlog decomposition (M15-C)

- **B-038** — `GET /api/v1/search?q=` route + index entry.
- **B-039** — `apps/extension` MV3 scaffold + esbuild build, wired into Turbo.
- **B-040** — popup UI (opportunities + search) + options (base URL, optional key); pure-logic tests.
- **B-041** — (v2) content-script page recognition; (later) Web Store / AMO submission.
