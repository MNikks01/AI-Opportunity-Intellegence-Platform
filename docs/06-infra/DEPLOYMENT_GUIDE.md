# Deployment Guide

**Phase 25 · Status: complete (live) · Last updated: 2026-07-10**
**Traces to:** [Infrastructure](INFRASTRUCTURE.md) · [CI/CD](CICD.md) · [Branching](../09-process/BRANCHING_STRATEGY.md)
**Realized in:** Vercel (web) + Neon (Postgres+pgvector), `.github/workflows/*.yml`, `docs/10-setup/DEPLOY.md`.

This is the operator's runbook: how the platform ships to production, what environment it needs, how the
scheduled jobs run, and how to roll back. The MVP target topology in [INFRASTRUCTURE](INFRASTRUCTURE.md)
(Fly.io services + Cloudflare) is the _documented scale path_; what is **live today** is the leaner
standalone deployment described here.

## 1. What is deployed today

| Component                | Host                                                          | Notes                                                                                                              |
| ------------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Web app** (`apps/web`) | **Vercel** (Hobby), Root Directory `apps/web`, preset Next.js | Standalone Next.js 16 App Router; RSC reads Postgres **directly** — no separate API/Redis needed to serve the app. |
| **Database**             | **Neon** Postgres 16 + pgvector (free)                        | Pooled host for the app; direct host for migrations.                                                               |
| **Scheduled jobs**       | **GitHub Actions cron**                                       | The production "scheduler": ingest/rescore/alerts/newsletter/digest run as workflows (see §5).                     |
| **Live demo**            | `ai-opportunity-intellegence-platfor.vercel.app`              | Keyless/stub mode by default (no login) so it runs with zero secrets.                                              |

The standalone Fastify `api` service and the BullMQ worker services exist in the repo and are the
scale-out surface; they are **not required** for the current self-serve web deployment.

## 2. Pipeline: commit → production

Continuous deployment is push-based (see [CICD](CICD.md) for the gates):

```
feature branch → PR into development → CI green → merge
development → PR into main (opened by maintainer) → merge to main
main push → Vercel auto-deploy (production)  +  Release workflow (Changesets)
```

- **CI must be green** (`ci.yml`: format, lint, typecheck, test, build + security job) before merge.
- **Vercel** builds and deploys automatically on push to `main`; every PR gets a preview deployment.
- **Releases** are cut by Changesets: merging to `main` opens/updates a "Version Packages" PR; merging
  that bumps versions and updates `CHANGELOG.md` (see [RELEASE_PROCESS](../09-process/RELEASE_PROCESS.md)).

## 3. Environment configuration

Everything external is behind an adapter+Stub, so the app boots with **no secrets** (stub mode). Set a
variable to activate the real integration. Full matrix in [ENV_SETUP](../10-setup/ENV_SETUP.md); the
essentials:

| Variable                            | Required for                       | Notes                                                                                                                 |
| ----------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                      | app + migrations                   | Neon **pooled** host for the app.                                                                                     |
| `APP_DATABASE_URL`                  | RLS enforcement                    | Restricted `aioi_app` role; falls back to `DATABASE_URL` if unset. Unset it when pointing a script at a different DB. |
| `OPENAI_API_KEY` / LiteLLM config   | real embeddings + scoring          | Without it, deterministic StubProvider runs.                                                                          |
| `CLERK_*`                           | auth                               | Stub/keyless mode otherwise. Clerk needs redirect URLs.                                                               |
| `STRIPE_*`                          | billing                            | Webhook signature required in prod.                                                                                   |
| `RESEND_API_KEY`, `NEWSLETTER_FROM` | email (alerts, newsletter, digest) | No-op if unset.                                                                                                       |
| `NEXT_PUBLIC_SITE_URL`              | absolute links in emails/feeds/OG  | e.g. the Vercel URL.                                                                                                  |

**Vercel:** set these in Project → Settings → Environment Variables (Vercel injects them natively —
the local `apps/web/link-root-env.mjs` symlink is a **local-only** convenience). Connectors
(Reddit/PH/YouTube) are app-only auth — **no callback/redirect URLs**; only Clerk and Stripe need those.

## 4. Database & migrations

- **Provider:** Neon (Postgres 16 + pgvector + pgcrypto). Prisma is the schema owner
  (`packages/database/prisma/schema.prisma`).
- **Apply migrations:** `pnpm --filter @aioi/database exec prisma migrate deploy`, run against the
  **direct** (non-pooled) Neon host as the **owner** role. The runtime app connects as `aioi_app`
  (restricted) so RLS is enforced.
- **Prisma 7 connection config (B-025):** connection URLs no longer live in `schema.prisma`. The CLI /
  `migrate` URL lives in `packages/database/prisma.config.ts` (reads `DATABASE_URL`), and the runtime
  client connects through the **`@prisma/adapter-pg` driver adapter** with `APP_DATABASE_URL`. There is
  **no query-engine binary** under adapters, so no `binaryTargets` is needed — this removes the old
  `rhel-openssl-3.0.x` serverless-binary footgun entirely.
- **Neon connection-string gotchas (all learned live, all fixed):**
  - Use the **pooled** host for the app/Vercel, the **direct** host for `prisma migrate`.
  - Add `connect_timeout=30` to survive cold-start `P1001`.
  - **Strip `channel_binding=require`** — Prisma auth-fails on it.

## 5. Scheduled jobs (the production scheduler)

Background work runs as GitHub Actions cron workflows — each is idempotent and **no-ops safely** when
its secrets are absent:

| Workflow             | Cron         | Does                                                                                |
| -------------------- | ------------ | ----------------------------------------------------------------------------------- |
| `refresh-data.yml`   | periodic     | Ingest sources → cluster → score → embed.                                           |
| `rescore.yml`        | periodic     | Re-score trends (rubric/model refresh).                                             |
| `deliver-alerts.yml` | hourly `:15` | Email undelivered EMAIL-channel alert notifications; sets `Notification.emailedAt`. |
| `newsletter.yml`     | periodic     | Send the public newsletter.                                                         |
| `weekly-digest.yml`  | weekly       | Per-org watchlist digest.                                                           |

Each supports `workflow_dispatch` (manual run), most with a `dry_run` input that previews counts without
sending. Secrets needed: `DEMO_DATABASE_URL`/`DATABASE_URL`, `APP_DATABASE_URL`, `RESEND_API_KEY`,
`NEWSLETTER_FROM`, `NEXT_PUBLIC_SITE_URL`.

## 6. First-time production setup

1. Create the Neon project (Postgres 16); enable `vector` + `pgcrypto`.
2. Create the restricted `aioi_app` role and grant it login; keep the owner role for migrations.
3. Run `prisma migrate deploy` against the direct host.
4. (Optional) Seed a demo dataset: `scripts/seed-demo.ts` / `scripts/demo-data.ts`.
5. In Vercel: import the repo, set Root Directory `apps/web`, preset Next.js, add env vars, deploy.
6. Add GitHub Actions secrets so the scheduled jobs can run; trigger one via `workflow_dispatch --dry_run`
   to verify.
7. Point DNS at Vercel and set `NEXT_PUBLIC_SITE_URL`.

## 7. Verifying a deploy

- App: hit the site root and `/trends`; a scored trend should render.
- Health: `/api/…/ready` on the Fastify service if the service surface is deployed.
- Feed: `/feed.xml` returns a valid RSS channel (empty channel, not a 500, if the DB is unreachable).
- Jobs: run `deliver-alerts` with `dry_run=true` and confirm the previewed counts.

## 8. Rollback

- **App:** Vercel → Deployments → promote the previous good deployment (instant; no rebuild). Or revert
  the offending commit on `main` and let CD redeploy.
- **Release/version:** revert the merge commit; Changesets will reconcile on the next run.
- **Database:** migrations are forward-only. To undo a schema change, ship a new compensating migration —
  never edit an applied one. Take a Neon branch/snapshot before a risky migration so you can restore.
- **Jobs:** disable a misbehaving workflow in the Actions UI; because each job is idempotent, re-running
  after a fix is safe.

## 9. Scale-out path (documented, not the current host)

When single-region Vercel + Neon + cron jobs stop being enough, migrate per the
[INFRASTRUCTURE](INFRASTRUCTURE.md) and [SCALABILITY_PLAN](../02-architecture/SCALABILITY_PLAN.md) docs:
containerized `api` + workers to Fly.io (then AWS/EKS), managed Postgres with replicas, Redis for
BullMQ queues + Streams bus, and Cloudflare CDN/WAF in front. The service code and Dockerfiles already
exist; the switch is an infra/ops change, not a rewrite.
