# @aioi/extension — AI Opportunity Intelligence (browser extension)

A Manifest V3 browser extension that puts the AI **"build now" opportunities** one click away, over the
public read API. Design: [ADR-0007](../../docs/adr/ADR-0007-browser-extension.md).

## What it does (v1)

- Popup lists the Golden-Quadrant **"build now"** opportunities (`/api/v1/opportunities`).
- A **search box** queries the public API (`/api/v1/search?q=`); results deep-link to the web app.
- **Settings:** a configurable **API base URL** (default production) and an optional **API key**
  (`aioi_…`, raises the rate limit). Persisted in `localStorage`.
- No permissions / no keys required — the public API is CORS-open, so the popup fetches it directly.

## Build

```bash
pnpm --filter @aioi/extension build   # → apps/extension/dist/  (esbuild)
```

## Load it (unpacked)

1. Build (above).
2. Open `chrome://extensions` (or `edge://extensions`), enable **Developer mode**.
3. **Load unpacked** → select `apps/extension/dist`.
4. Click the toolbar icon. Point **Settings → API base URL** at `http://localhost:3000` for local dev,
   or leave the default for production.

Firefox: `about:debugging` → **This Firefox** → **Load Temporary Add-on** → pick `dist/manifest.json`.

## Layout

- `public/manifest.json` — MV3 manifest. `public/popup.html` / `popup.css` — the popup shell.
- `src/api.ts` — pure logic (URL building, response mapping); unit-tested (`src/api.test.ts`).
- `src/popup.ts` — DOM wiring (fetch + localStorage), bundled by `build.mjs` (esbuild) → `dist/popup.js`.

## Content script (B-041a)

On a **GitHub repo** or **Hugging Face model** page, the content script (`src/content.ts`) looks the
entity up via `GET /api/v1/entities/lookup?name=` and, if AIOI tracks it, injects a small badge (linked
trends + momentum) in the corner. Pure URL→name parsing lives in `src/content-api.ts` (unit-tested); it
uses the production API base (a per-user base for the content script is a future refinement).

## Deferred (v2)

Chrome Web Store / AMO submission — see ADR-0007 §D5.
