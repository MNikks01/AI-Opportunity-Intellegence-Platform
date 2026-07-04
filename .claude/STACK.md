# STACK

Authoritative quick reference. Justifications live in
[TRD §2](../docs/01-product/TECHNICAL_REQUIREMENTS_DOCUMENT.md) and
[ADR-0001](../docs/adr/ADR-0001-core-stack.md).

| Layer | Choice |
|---|---|
| Language | TypeScript (strict) everywhere |
| Monorepo | pnpm workspaces + Turborepo |
| Web | Next.js (App Router) + React 19 |
| UI | Tailwind + shadcn base → `@aioi/ui` (own identity) |
| State/data | React Query (server) + Zustand (client) |
| Forms/validation | React Hook Form + Zod (shared schemas) |
| Tables/charts/flow | TanStack Table · Recharts · React Flow |
| Backend | Fastify (not NestJS) |
| Internal API | tRPC (end-to-end types) |
| Public API | REST + OpenAPI 3.1 |
| ORM/DB | Prisma + PostgreSQL 16 |
| Vector | pgvector (MVP) → dedicated vector DB later |
| Cache/queue/bus | Redis + BullMQ + Redis Streams |
| Realtime | WebSockets |
| Auth | Clerk behind `@aioi/auth` adapter |
| AI gateway | LiteLLM (OpenAI/Anthropic/Gemini/OpenRouter) |
| LLM obs | Langfuse + OpenTelemetry |
| Errors | Sentry |
| Storage/CDN | Cloudflare R2 (S3) + Cloudflare CDN/WAF |
| Hosting (MVP) | Vercel (web) + Fly.io (services) |
| Hosting (scale) | AWS (ECS Fargate + RDS + ElastiCache + SQS) |
| Payments | Stripe (Billing + metered) |
| Quality | ESLint · Prettier · Commitlint · Husky · Changesets |
| Test | Vitest · RTL · Playwright · MSW |
| CI/CD | GitHub Actions (+ gitleaks, dependabot) |

## Workspaces (`@aioi/*`)

apps: `web` `admin` `marketing` `docs` · services: `api` `ai-service` `ingestion-service`
`scheduler` `notification-service` · packages: `ui` `ai-sdk` `database` `auth` `shared`
`validation` `logger` `analytics` `config` `eslint-config` `prettier-config` `tsconfig`

## Non-negotiables

- All LLM calls via `@aioi/ai-sdk`. All DB access via `@aioi/database`. Auth/RBAC via `@aioi/auth`.
- No prompt/model/RAG change without a green `llm-eval-harness` run.
- No data source without a legality classification (`data-source-integration` skill).
- RBAC + audit on every mutation; validate all external input with Zod.
