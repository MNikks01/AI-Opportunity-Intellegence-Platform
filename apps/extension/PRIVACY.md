# Privacy policy — AI Opportunity Intelligence extension

_Last updated: 2026-07-11_

This extension is designed to collect **no personal data**.

## What it does

- **Reads the current page URL** on `github.com` and `huggingface.co` only, to detect which repo/model
  you're viewing and check whether AIOI tracks it. It does **not** read page content, form fields, or
  anything you type.
- **Calls a public, read-only API** (`/api/v1/*`) to fetch opportunity data. These requests contain only
  what you searched for or the public repo/model name from the URL — no identifiers.

## What it stores

- Your chosen **API base URL** and an **optional API key** are stored **locally** in the popup's
  `localStorage` on your device. They are never sent anywhere except, in the API key's case, to the API
  server you configured (as a standard `Authorization` header) to raise your rate limit.

## What it does NOT do

- No analytics, no tracking, no cookies, no ad networks.
- No collection of browsing history, personal information, or page content.
- No data sold or shared with third parties.

## Permissions

- **Content scripts** limited to `github.com` / `huggingface.co` — solely to read the URL and show a
  badge. No broad host permissions.

## Contact

Set your contact in the store listing before publishing. Questions: open an issue on the project
repository.
