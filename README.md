# AI Opportunity Intelligence Platform

> Discover AI trends before everyone else. Validate opportunities. Build faster.

An AI-powered intelligence platform that continuously monitors the AI ecosystem, deduplicates
signals into **trends**, attaches a consistent **10-dimension opportunity scorecard + action plan**
to each, and delivers them through dashboards, alerts, briefs, reports, workspaces, and an API.

This is **not** a news site, an AI-tools directory, or a trends clone — it's a decision layer that
tells you *whether an AI opportunity is worth your time and money, and what to do next.*

## Status
🏗️ **In construction, phase by phase** (docs before code, no placeholders). See
[docs/09-process/ROADMAP.md](docs/09-process/ROADMAP.md). Currently: **Phases 1–6 + TRD complete.**

## Documentation
Start at [docs/README.md](docs/README.md). Key docs:
[Vision](docs/01-product/VISION_AND_MISSION.md) ·
[PRD](docs/01-product/PRODUCT_REQUIREMENTS_DOCUMENT.md) ·
[TRD](docs/01-product/TECHNICAL_REQUIREMENTS_DOCUMENT.md) ·
[ADR-0001 Core Stack](docs/adr/ADR-0001-core-stack.md).

## Planned stack (see TRD/ADR for justifications)
TypeScript · Next.js/React · Fastify · tRPC (internal) + REST/OpenAPI (public) · Prisma/PostgreSQL +
pgvector · Redis/BullMQ · Clerk (behind adapter) · LiteLLM + Langfuse + OpenTelemetry · Vercel + Fly.io
(→ AWS at scale) · Cloudflare R2/CDN · Stripe.

## Planned monorepo (realized in Phase 17)
`apps/` (web, admin, marketing, docs) · `services/` (api, ai-service, ingestion-service, scheduler,
notification-service) · `packages/` (ui, ai-sdk, database, auth, shared, validation, logger, …) ·
`infra/` · `docs/` · `.claude/` · `.github/`.

## Claude tooling
Custom skills live in [`.claude/skills/`](.claude/skills/README.md): `data-source-integration`,
`opportunity-scoring-engine`, `llm-eval-harness` (+ `ui-ux-pro-max`). Installed global skills and the
full skill vetting are in [`SKILLS_ADOPTION_REPORT.md`](SKILLS_ADOPTION_REPORT.md). Working
conventions for AI assistants are in [`CLAUDE.md`](CLAUDE.md).

## License
TBD (Phase: pre-license).
