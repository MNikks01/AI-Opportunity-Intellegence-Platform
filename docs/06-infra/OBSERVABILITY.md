# Observability

**Phase 26 · Status: complete · Last updated: 2026-07-10**
**Traces to:** [Infrastructure](INFRASTRUCTURE.md) · [System Design](../02-architecture/SYSTEM_DESIGN.md) · [Deployment](DEPLOYMENT_GUIDE.md)
**Realized in:** `@aioi/logger` (pino), `IngestionRun` model, `apps/web/app/sources`, GitHub Actions run history, `@aioi/ai-sdk` (Langfuse-ready).

Observability answers three questions in production: _is it up_, _is it healthy_, and _when it breaks,
why_. This document records the signals we emit, where they land, and what we alert on. The philosophy
matches the rest of the stack: instrument through adapters so the app runs (and stays debuggable) with
zero secrets, and light up richer backends when configured.

## 1. The three pillars (and where we are)

| Pillar      | Today                                                                                                     | Configured backend (prod)                    |
| ----------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| **Logs**    | Structured JSON via `@aioi/logger` (pino), secret-redacted, trace/org-correlated                          | Vercel/Fly log drains → aggregator           |
| **Metrics** | Data-driven operational metrics in Postgres (`IngestionRun`, notifications, audit) + `/sources` dashboard | Prometheus/OTel counters at the service tier |
| **Traces**  | Correlation IDs propagated via `withContext`; LLM traces ready via LiteLLM→Langfuse                       | Langfuse (B-007, keys-gated) + OpenTelemetry |

## 2. Logging

`@aioi/logger` wraps **pino** with production discipline baked in:

- **Structured JSON** at all times — machine-parseable, one event per line.
- **Secret/PII redaction** is on by default (`*.password`, `*.token`, `*.apiKey`, `*.secret`,
  `req.headers.authorization` → `[redacted]`). Never log raw tokens, request bodies with credentials, or
  personal data — see [CODE_GUIDELINES](../08-quality/CODE_GUIDELINES.md) §3.
- **Correlation:** `withContext({ traceId, orgId, service })` returns a child logger so every line for a
  request/job is joinable. Multi-tenant work always carries `orgId` for per-tenant triage.
- **Levels:** `info` in production, `debug` in dev, override with `LOG_LEVEL`.

**Where logs go:** Vercel captures web/RSC logs; the scheduled GitHub Actions jobs surface their logs in
the workflow run (with `::warning::`/`::error::` annotations for skips and failures); the containerized
services (scale path) ship stdout JSON to a drain.

## 3. Metrics & health signals

We prefer **durable, queryable operational state in Postgres** over ephemeral counters — it survives a
process restart and powers in-product dashboards.

- **Source / ingestion health — `IngestionRun`** (per source): `status` (RUNNING/SUCCESS/FAILED),
  `itemCount`, `error`, `startedAt`/`finishedAt`, `cursor`. This is the backbone of the recent source
  observability work: last-run status, item counts, and **dormant-source** detection are all derived
  from it, and the failure path records the error text.
- **`/sources` dashboard** (`apps/web/app/sources`) renders this live: per-source item counts, last-run
  time and outcome, and a dormant indicator when a source hasn't produced signals recently.
- **Delivery signals:** `Notification.emailedAt` (alert email delivered), Brief open tracking, newsletter
  send counts — each job logs sent/skipped/failed counts and honours a `dry_run`.
- **Audit log:** every mutating/privileged action writes an audit entry (RBAC + tenancy), which doubles
  as a security and behavioural signal.
- **Business/product metrics** flow through `@aioi/analytics` (typed events) toward the north star,
  **Weekly Acted-On Opportunities** — see the `analytics` skill and [ANALYTICS](../07-security/) plan.

**Service-tier metrics (scale path):** the Fastify `api` and workers expose latency/throughput/error
counters and queue depth (BullMQ) via OpenTelemetry/Prometheus; wired when those services are deployed.

## 4. LLM observability (first-class)

LLM cost and quality are product metrics, not just ops metrics:

- **All model calls go through `@aioi/ai-sdk`** (LiteLLM gateway) — a single choke point for token
  usage, latency, cost, and model routing. Nothing calls a provider SDK directly.
- **Langfuse** tracing (B-007) is wired behind the gateway and activates on keys — per-call traces,
  prompt versions, and cost attribution.
- **Quality** is gated separately by `llm-eval-harness` (faithfulness / relevance / schema-validity /
  cost / latency) with a CI regression diff, so a prompt/model change can't silently degrade output.
- **Budget guardrails:** cost-per-active-user is tracked; scoring results are cache-keyed to avoid
  re-spending on unchanged inputs (see the `caching` + `performance` skills).

## 5. Tracing & correlation

- A `traceId` is generated/propagated per request and per background job and threaded through
  `withContext`, so a single opportunity's journey (ingest → cluster → score → embed → alert) is
  joinable across log lines.
- At the service tier this becomes OpenTelemetry spans across the queue/event boundaries
  (`signal.ingested` / `trend.updated`).

## 6. Health checks

- **Web:** the site root and `/trends` are the effective liveness check for the RSC app;
  `/feed.xml` degrades to a valid empty channel rather than 500-ing when the DB is unreachable.
- **API service:** `/health` (liveness) and `/ready` (readiness — DB/Redis reachable) on the Fastify
  server.
- **Jobs:** each scheduled workflow is its own health signal — a red run in the Actions history is the
  first alert that ingestion/scoring/delivery has broken.

## 7. Alerting

| Condition                   | Signal                                            | Response                                                                           |
| --------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Ingestion/scoring job fails | GitHub Actions run failure + job annotations      | Investigate the run log; re-dispatch after fix (idempotent).                       |
| Source goes dormant         | `/sources` dormant indicator + `IngestionRun` gap | Check connector auth/rate limits; a keyless source may just be a no-op.            |
| Deploy broken               | Vercel deployment failure / error rate            | Promote previous good deployment (see [DEPLOYMENT_GUIDE](DEPLOYMENT_GUIDE.md) §8). |
| LLM cost/latency spike      | ai-sdk usage + Langfuse                           | Check model routing/cache hit rate; verify eval gate still green.                  |
| Secret in a commit          | gitleaks (push events)                            | Rotate the secret, purge history.                                                  |

Production error tracking integrates with **Sentry** (adapter) when configured; until then, structured
error logs plus job-failure notifications are the alerting surface.

## 8. Dashboards

- **In-product:** `/sources` (connector health), the trends dashboard, and admin views read directly
  from Postgres — no external dependency to see operational state.
- **Ops (scale path):** Grafana over Prometheus/OTel for service latency, queue depth, and DB metrics;
  Langfuse for LLM traces; the analytics warehouse for funnels and the north-star metric.

## 9. Gaps & forward work

- Wire OpenTelemetry export + a Grafana/Prometheus stack once the `api`/worker services are deployed.
- Enable Langfuse in production (B-007) by setting keys.
- Add a synthetic uptime check + on-call alert routing (PagerDuty/Slack) for the public surface.
- Emit an SLO dashboard (availability, P95 latency, ingestion freshness, LLM cost/user) once the metric
  pipeline is externalized.
