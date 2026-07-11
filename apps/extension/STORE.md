# Store listing — AI Opportunity Intelligence

Copy + checklist for submitting the extension to the **Chrome Web Store** / **Firefox AMO**. The
engineering is done (`pnpm --filter @aioi/extension package` → `aioi-extension.zip`); submission itself
needs a **publisher account** and manual review — see the checklist.

## Listing copy

**Name:** AI Opportunity Intelligence

**Summary (≤132 chars):** See what to build before it's a trend — the AI "build now" opportunities and
tracked models/repos, one click away.

**Description:**

> AI Opportunity Intelligence puts the signal in your toolbar. Open the popup to browse the
> Golden-Quadrant **"build now"** opportunities (high demand, low supply) and search scored AI trends —
> each links straight to the full app. On **GitHub** and **Hugging Face** pages, a subtle badge shows
> whether that repo or model is tracked, how many trends reference it, and its momentum.
>
> - **Build-now opportunities** ranked by opportunity score.
> - **Search** the public opportunity database.
> - **Page awareness** on GitHub / Hugging Face (models, MCP servers, repos).
> - **No account required.** Optional API key raises your rate limit.
>
> Reads a public, read-only API — no personal data collected. Configure the API base + optional key in
> the popup's Settings.

**Category:** Developer Tools · **Language:** English

## Permissions justification (for review)

- **`content_scripts` on github.com / huggingface.co** — to detect the repo/model you're viewing and
  show whether AIOI tracks it. It only reads the page URL; it does not read page content or forms.
- **No `host_permissions`, no `storage` permission** — the public API is CORS-open, and settings are
  kept in the popup's `localStorage`.

## Assets needed (manual)

- Icon set (16/32/48/128 px) — currently `"icons": {}`; add before submission.
- 1–3 screenshots (1280×800) of the popup + a badge on a GitHub page.
- A small promo tile (440×280) optional.

## Submission checklist

1. `pnpm --filter @aioi/extension package` → `apps/extension/aioi-extension.zip`.
2. Add icons + screenshots (above).
3. **Chrome:** chrome.google.com/webstore/devconsole (one-time $5 dev fee) → New item → upload the zip →
   paste this copy → link the privacy policy ([PRIVACY.md](./PRIVACY.md)) → submit for review.
4. **Firefox:** addons.mozilla.org/developers → Submit a New Add-on → upload → same copy/policy.

> **Status: blocked on a publisher account** (and the icon/screenshot assets). Everything code-side is
> ready; the store submission is an ops/release step for the operator.
