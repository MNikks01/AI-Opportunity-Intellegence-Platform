# Deploy — free public demo (Vercel + Neon)

Ship a live, shareable demo for **$0**. In demo mode the platform runs **keyless/stub** (no login, no
paid services): the web app talks straight to Postgres, so a public demo needs only two free things:

| Piece                   | Host               | Free tier                       |
| ----------------------- | ------------------ | ------------------------------- |
| **Web app** (Next.js)   | **Vercel** (Hobby) | free for personal/demo projects |
| **Postgres + pgvector** | **Neon**           | free (0.5 GB)                   |

Not used in demo mode (skip entirely): the `api` service, Redis, LiteLLM, Clerk, Stripe, S3. They plug
in later when you go "full real" (see the last section).

> Why this works: `apps/web` reads the database directly (Next.js RSC → `@aioi/database`) — it does not
> call the `api` service or Redis. Verified: the site runs green on a single `DATABASE_URL` and nothing
> else.

---

## 0. Prerequisites

- The repo is on GitHub (it is).
- A free **Neon** account (neon.tech) and a free **Vercel** account (vercel.com). Sign in to both with
  GitHub. No card required.
- Node + pnpm locally (to migrate + seed the remote DB once).

---

## 1. Create the database (Neon)

1. neon.tech → **New Project** (pick a region near you). Postgres 16 with **pgvector** is supported.
2. Copy the **connection string** (the **pooled** one, host contains `-pooler`) — looks like:
   `postgresql://<user>:<pw>@ep-xxx-pooler.<region>.aws.neon.tech/neondb?sslmode=require`

That single string is your `DATABASE_URL`.

---

## 2. Migrate + seed the remote DB (once, from your machine)

```bash
# point at Neon and apply the schema (extensions, pgvector/HNSW, RLS policies)
DATABASE_URL="postgresql://…-pooler…/neondb?sslmode=require" \
  pnpm --filter @aioi/database exec prisma migrate deploy
```

Then load something to look at — pick one:

```bash
# a) quick: one deterministic seeded trend (no keys needed)
DATABASE_URL="…neon…" pnpm exec tsx scripts/seed-demo.ts

# b) richer: ingest the 3 keyless sources (HN + GitHub + Hugging Face) → cluster → score
#    (scoring is Stub unless you also export OPENAI_API_KEY + LITELLM_BASE_URL)
DATABASE_URL="…neon…" pnpm exec tsx scripts/demo-data.ts
```

> Demo mode is single-tenant, so **RLS isn't needed** — set only `DATABASE_URL` (the Neon owner) and
> leave `APP_DATABASE_URL` unset; the app falls back to the owner connection. (Add the restricted
> `aioi_app` role only when you turn on multi-tenant auth.)

---

## 3. Deploy the web app (Vercel)

1. vercel.com → **Add New… → Project** → import this GitHub repo.
2. **Root Directory:** set to **`apps/web`** (Vercel then installs the pnpm workspace from the repo root
   and builds just the web app). Framework preset auto-detects **Next.js**.
3. **Environment Variables** (Project Settings → Environment Variables) — for the demo, just one:
   - `DATABASE_URL` = your Neon pooled string.
   - (Leave everything else unset → keyless/stub, no login.)
4. **Deploy.** Vercel runs `pnpm install` (which runs `prisma generate`) + `next build`, then serves it.

You get a public URL like `https://<project>.vercel.app`. Open it → **Trends · Watchlists ·
Notifications · Briefs · Sources**, no login. 🎉

> Pages are `force-dynamic` (rendered per request), so the build doesn't touch the DB — only the running
> app does. Prisma connects to Neon over the pooled URL at request time.

---

## 4. Keep it fresh (optional, still free)

The demo is static data until you refresh it. Options:

- **Re-run step 2** whenever you want new trends (cheap, from your laptop).
- **Vercel Cron (free)** → add a route handler that runs `runHackerNewsIngestion` + `clusterRecentSignals`
  - `scoreClusteredTrends`, and a `vercel.json` cron to hit it daily. (Scoring uses the Stub unless you
    add `OPENAI_API_KEY` to Vercel env — that would cost OpenAI credits per run.)

---

## 5. Going "full real" later (when you have a domain + want auth/billing)

Demo → product is additive, no rearchitecting:

- **More sources** — paste `REDDIT_CLIENT_ID/SECRET`, `PRODUCTHUNT_TOKEN`, `YOUTUBE_API_KEY` into env.
  These use **app-only auth — no callback/redirect URLs needed.**
- **Real AI** — add `OPENAI_API_KEY` (+ run the LiteLLM gateway, or point `LITELLM_BASE_URL` at a
  provider) → real embeddings + scoring.
- **Login (Clerk)** — set the `CLERK_*` keys. **This is where redirect URLs matter:** in the Clerk
  dashboard add your Vercel domain to the allowed origins + set the sign-in/after-sign-in URLs, and point
  the `user.created` webhook at your API's `/webhooks/clerk`.
- **Billing (Stripe)** — add the `STRIPE_*` keys and a webhook to `/webhooks/stripe`. Redirect URLs
  (checkout success/cancel) are derived from your app URL.
- **api + scheduler services** — deploy them (a small VPS or a PaaS) once you need the public API or
  always-on autonomous ingestion. Redis (Upstash free) for the scheduler queue.

See [ENV_SETUP.md](./ENV_SETUP.md) for exactly where each key comes from.
