# AI Opportunity Intelligence Platform

> Discover AI trends before everyone else. Validate opportunities. Build faster.

An AI-powered intelligence platform that continuously monitors the AI ecosystem, clusters raw signals
into **trends**, attaches a consistent **10-dimension opportunity scorecard + action plan** to each,
and delivers them through dashboards, semantic search, alerts, and daily briefs.

This is **not** a news site, an AI-tools directory, or a trends clone — it's a decision layer that
tells you _whether an AI opportunity is worth your time and money, and what to do next._

## Status

✅ **Feature-complete, released, and running end-to-end.** Built docs-before-code, phase by phase.
**200 tests green.** Every external integration sits behind an adapter with a deterministic **Stub**,
so the whole platform runs **green with no external keys** and activates each real service on config.
With an OpenAI key, clustering and scoring run on **real models** — verified live end-to-end (real
embeddings merge cross-source signals into one trend; real LLM scores them; the scheduler drives the
whole loop on a cron).

## What it does — the autonomous pipeline

```
  ingest ─▶ dedupe ─▶ cluster ─▶ score ─▶ embed ─▶ deliver
  6 sources          (semantic)  (10-dim   (pgvector)  ├─ alerts + notifications
                                  LLM,                  ├─ daily briefs (+ email)
                                  eval-gated)           └─ keyword + semantic search
```

A scheduler (BullMQ cron) runs it continuously: **ingest → cluster signals into trends → score each
with the opportunity engine → embed for semantic search → auto-evaluate alerts → generate daily
briefs.** No manual step.

**Six ingestion connectors** — all official APIs, each with an in-header legality classification and
rate-limit handling:

| Source           | Auth                  | Signal                  |
| ---------------- | --------------------- | ----------------------- |
| **Hacker News**  | none                  | launches & discussion   |
| **GitHub**       | none (token optional) | emerging AI repos       |
| **Hugging Face** | none (token optional) | model momentum          |
| **Reddit**       | key (app-only OAuth)  | community demand        |
| **Product Hunt** | key                   | product launches        |
| **YouTube**      | key                   | creator/tutorial signal |

The keyless three ingest real signal out of the box; the key-gated three no-op cleanly until their key
is set.

## Features

- **Trends & scorecards** — every trend gets a 10-dimension opportunity scorecard (business, developer,
  creator, SEO, monetization, competition, risk, difficulty, predicted-lifetime → composite
  **opportunity**), each with evidence, confidence, and a versioned rubric. AI output is **eval-gated**
  (golden invariants must hold in CI).
- **Action plans** — turn a scored trend into concrete SaaS/API/content ideas, keywords, product names,
  target audience, pricing, MVP scope, and tech stack.
- **Search** — keyword (Postgres full-text) + **semantic** (pgvector cosine).
- **Watchlists, alerts & notifications** — track trends; alerts fire automatically when scores cross
  thresholds; an in-app inbox (+ email delivery).
- **Daily briefs** — a per-org digest of top opportunities, delivered in-app and by email.
- **Billing** — Free/Pro plans with entitlements, real Stripe checkout + webhooks.
- **Connector health** — a `/sources` page with per-source signal counts and last-run stats.
- **Multi-tenant, secure by default** — Clerk auth (with enforced sign-in) + API keys, RBAC,
  Postgres **row-level security**, audit logging, and **GDPR export/erasure**.

## Getting started

Run the whole stack locally (green with no external keys):
**[docs/10-setup/RUNNING_LOCALLY.md](docs/10-setup/RUNNING_LOCALLY.md)**.
To activate real integrations (AI, Clerk, Stripe, connectors), see where to get each key:
**[docs/10-setup/ENV_SETUP.md](docs/10-setup/ENV_SETUP.md)**.

```bash
pnpm install
docker compose -f infra/docker/docker-compose.yml up -d   # postgres+pgvector, redis, minio, litellm
cp .env.example .env
pnpm --filter @aioi/database exec prisma migrate deploy
pnpm exec tsx scripts/seed-demo.ts                         # optional: a scored trend to look at
pnpm dev                                                   # web :3000 · api :3001 · scheduler
```

Open **http://localhost:3000** → Trends · Watchlists · Notifications · Briefs · Billing · Sources.

## Stack

TypeScript · Next.js (App Router, RSC) · Fastify · tRPC (internal) + REST/OpenAPI (public) ·
Prisma / PostgreSQL + pgvector · Redis / BullMQ · Clerk (behind an adapter) · Stripe · Resend ·
LiteLLM gateway (OpenAI/Anthropic/…) · pnpm + Turborepo · Changesets · GitHub Actions CI/CD.
Deployment target: Vercel + Fly.io → AWS at scale, Cloudflare R2/CDN. Each MVP choice has a documented
exit ramp in the [TRD](docs/01-product/TECHNICAL_REQUIREMENTS_DOCUMENT.md) / [ADRs](docs/adr/).

## Monorepo

```
apps/        web (the product UI) · admin · marketing · docs
services/    api · ai-service · ingestion-service · scheduler · notification-service
packages/    ui · ai-sdk · database · auth · billing · email · cache · analytics ·
             shared · validation · logger · config  (+ eslint/prettier/tsconfig presets)
infra/       docker-compose (postgres/redis/minio/mailhog/litellm) · litellm config
docs/        product · architecture · design · data · api · infra · security · quality · process · setup
```

## Documentation

Start at [docs/README.md](docs/README.md). Key docs:
[Vision](docs/01-product/VISION_AND_MISSION.md) ·
[PRD](docs/01-product/PRODUCT_REQUIREMENTS_DOCUMENT.md) ·
[TRD](docs/01-product/TECHNICAL_REQUIREMENTS_DOCUMENT.md) ·
[Roadmap](docs/09-process/ROADMAP.md) ·
[ADRs](docs/adr/) (core stack · auth/RBAC · row-level security).

## Claude tooling

Custom skills live in [`.claude/skills/`](.claude/skills/README.md): `data-source-integration`,
`opportunity-scoring-engine`, `llm-eval-harness`. Working conventions for AI assistants are in
[`CLAUDE.md`](CLAUDE.md); the full skill vetting is in
[`SKILLS_ADOPTION_REPORT.md`](SKILLS_ADOPTION_REPORT.md).

## License

TBD (pre-license).
