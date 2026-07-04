# Infrastructure

**Phase 16 · Status: complete (MVP topology) · Last updated: 2026-07-03**
**Traces to:** [TRD](../01-product/TECHNICAL_REQUIREMENTS_DOCUMENT.md) · [System Design](../02-architecture/SYSTEM_DESIGN.md)
**Realized in:** `infra/` (docker, kubernetes, terraform, github, monitoring).

## 1. Environments

| Env          | Purpose              | Data                                                         | Deploy                |
| ------------ | -------------------- | ------------------------------------------------------------ | --------------------- |
| `local`      | dev                  | Docker Compose (Postgres+pgvector, Redis, MinIO=S3, mailhog) | `pnpm dev` (Turbo)    |
| `preview`    | per-PR               | ephemeral branch DB + Vercel preview                         | auto on PR            |
| `staging`    | pre-prod, full stack | isolated managed PG/Redis                                    | auto on merge to main |
| `production` | live                 | HA managed PG (replicas) + Redis + R2                        | promoted release      |

## 2. MVP topology

- **Web/marketing/docs (`apps/*`):** Vercel (Next.js, SSR/ISR, edge caching for SEO pages).
- **Services (`services/*`):** containerized, deployed to **Fly.io** (global app + workers).
  - `api` (public + tRPC), `ai-service`, `ingestion-service` (worker), `scheduler` (worker),
    `notification-service` (worker). Workers scale independently of `api`.
- **Postgres 16 + pgvector:** Fly Postgres (primary + replica) for MVP; **RDS** at scale.
- **Redis:** Upstash/Fly Redis (cache, BullMQ queues, Streams bus).
- **Object storage:** Cloudflare **R2** (S3-compatible), served via Cloudflare CDN. `MinIO` locally.
- **Edge:** Cloudflare CDN + WAF + rate-limiting in front of api/marketing.
- **Managed third parties:** Clerk (auth), Stripe (billing), Sentry (errors), Langfuse (LLM obs),
  LiteLLM (self-hosted or managed gateway to model providers).

## 3. Scale target (documented, not built at MVP)

AWS: **ECS Fargate** (services) + **RDS Postgres** (Multi-AZ + replicas) + **ElastiCache Redis** +
**SQS/EventBridge** (bus) + **S3/CloudFront** or keep R2. Migration is per-service (containers) — see
ADR-0004 trigger. IaC in `infra/terraform`; k8s manifests in `infra/kubernetes` for a future EKS path.

## 4. Containers & IaC

- **Docker:** multi-stage builds, non-root user, distroless/slim base, pinned digests, healthcheck,
  SBOM generated in CI. One image per service; Turborepo prune for lean context.
- **Compose (`infra/docker`):** local full stack (db, redis, minio, mailhog, litellm, services).
- **Terraform (`infra/terraform`):** provider config, DNS (Cloudflare), R2 buckets, managed DB/Redis,
  secrets wiring, environments as workspaces. State remote + locked. Least-privilege IAM; OIDC from CI
  (no static cloud keys).
- **Kubernetes (`infra/kubernetes`):** manifests/Helm for the AWS/EKS scale path (deployments, HPA,
  network policies) — staged for later.

## 5. CI/CD (detail in CICD.md, Phase 19)

GitHub Actions pipeline gates (PR): install → lint → typecheck → unit → integration → **llm-eval
smoke** → build → docker build → security/dependency/license/secret scan → coverage → Vercel preview +
Fly staging preview. Main adds: E2E (Playwright) → full llm-eval → prod deploy → DB migration
(gated) → release (Changesets) → smoke check → auto-rollback on failure → Slack notify.

## 6. Observability (detail in OBSERVABILITY.md, Phase 26)

- **Logs:** structured JSON (pino, `packages/logger`), shipped to a log backend; request/trace ids.
- **Metrics:** RED/USE per service; queue depth, ingestion lag, scoring cost/latency, LLM tokens.
- **Traces:** OpenTelemetry across services; **Langfuse** for every LLM call (cost, tokens, eval, prompt version).
- **Errors:** Sentry (web + services). **Health:** `/health` (liveness) + `/ready` (deps) on every service.
- **Dashboards & alerts:** SLO dashboards (availability, p95 latency, ingestion freshness, cost/active user);
  paging on SLO burn + source-health + queue-backlog.

## 7. Security & networking (baseline; full SECURITY_GUIDE Phase 7)

Private networking between services; secrets in platform secret managers (rotation policy); WAF +
per-IP/per-key rate limits at edge; TLS everywhere; least-privilege IAM via OIDC; secret scanning in CI.

## 8. Backup & disaster recovery (detail in DR/BACKUP docs)

- Postgres: automated daily snapshots + PITR (WAL); tested restore runbook; RPO ≤ 15m, RTO ≤ 1h target.
- R2: versioned buckets. Redis: treated as ephemeral (rebuildable cache/queues) — no critical-only state.
- DR runbook + quarterly restore drill; multi-AZ at scale.

## 9. Cost management

Autoscale workers to zero when idle where possible; cache scorecards; cheaper draft models; context
compression; per-env budgets + alerts; LLM cost tracked per active user as a first-class metric.

## 10. Review checklist

- [x] Four environments defined incl. ephemeral previews.
- [x] MVP topology (Vercel + Fly + R2 + Cloudflare) and AWS scale target both documented.
- [x] IaC (Terraform) + containers (multi-stage, non-root, pinned) + local Compose specified.
- [x] CI/CD gates include the llm-eval quality gate and auto-rollback.
- [x] Observability (logs/metrics/traces + Langfuse), health/readiness, SLOs, and DR/backup covered.
- [x] Secrets via managers + OIDC (no static keys); edge WAF + rate limits.
