# ADR-0001 — Core Technology Stack

- **Status:** Accepted
- **Date:** 2026-07-03
- **Deciders:** Principal Architect, Staff FE, Staff BE, AI Eng, DevOps
- **Context source:** [TRD §2](../01-product/TECHNICAL_REQUIREMENTS_DOCUMENT.md)

## Context
We need a stack that (a) is one language end-to-end for a small team, (b) is SEO-strong (content is
our acquisition engine), (c) handles heavy async ingestion + LLM workloads, (d) supports multi-tenant
RBAC, and (e) has a credible path from MVP economics to scale.

## Decisions & rationale

### D1 — Backend: Fastify (not NestJS)
Fastify has the lowest per-request overhead in Node and first-class JSON-schema/OpenAPI support,
which suits an API + high-volume ingestion workers. NestJS gives structure but imposes DI/decorator
overhead and a heavier mental model. **We adopt NestJS-style modular boundaries manually on top of
Fastify** — structure without the framework tax. Revisit if team size/complexity grows past the
point where explicit DI pays for itself.

### D2 — API: tRPC internally + REST/OpenAPI externally
Both web and api are TypeScript, so tRPC gives end-to-end types with zero codegen for our own
client — big velocity win. But third parties, the browser extension, and webhooks need a stable,
language-agnostic contract, so the **public API is REST with a generated OpenAPI spec**. Hybrid, not
either/or.

### D3 — Auth: Clerk for v1 behind a `packages/auth` adapter
Clerk ships organizations, roles, SSO, and MFA out of the box — weeks saved vs building on Auth.js.
Risk is cost/lock-in. **Mitigation:** all auth access goes through `packages/auth`, so swapping to
Auth.js later is an adapter change, not a rewrite. Revisit at Team/Business scale or if seat pricing
hurts unit economics.

### D4 — Vector: pgvector (not a dedicated vector DB) for MVP
One datastore = far less operational surface. pgvector with an HNSW index is sufficient for MVP-scale
semantic/RAG search. Risk is recall/latency at large scale. **Mitigation:** retrieval is behind
`packages/ai-sdk`; a dedicated vector DB (Pinecone/Weaviate/Qdrant) can slot in later. Revisit when
corpus or latency SLOs demand it (own ADR).

### D5 — AI: LiteLLM gateway + Langfuse + OpenTelemetry
LiteLLM gives one interface + routing/fallback/cost-caps across OpenAI/Anthropic/Gemini/OpenRouter,
so provider choice is a config decision. Langfuse is LLM-native observability (token/cost/eval/prompt
mgmt); OpenTelemetry is the vendor-neutral standard for app/infra traces. They cover **different
layers**, so we run both rather than choosing.

### D6 — Hosting: Vercel (web) + Fly.io (services) for MVP; AWS as scale target
Vercel is the best Next.js host for DX + SEO/ISR. Fly.io gives cheap, global, always-on workers with
managed Postgres/Redis and volumes — better fit than Railway/Render for our worker + global-latency
profile. AWS (ECS Fargate + RDS + ElastiCache + SQS) is the documented scale path; migration is
service-by-service since services are containerized.

### D7 — Event bus: Redis Streams / BullMQ for MVP
Already in-stack for cache/queues; simplest durable-enough bus for our volume. Producers/consumers
use a thin interface so we can swap to NATS/SQS/Kafka without touching business logic.

## Consequences
- **Positive:** one language, fast iteration, SEO-strong, low MVP ops cost, provider-agnostic AI,
  clear scale ramp, every risky choice has a documented exit ramp.
- **Negative / debt accepted:** manual modular structure on Fastify; Clerk + Fly + pgvector are
  MVP-optimized choices we've explicitly agreed to revisit — each has a follow-on ADR trigger.

## Follow-on ADRs (to write when triggered)
ADR-0002 auth swap criteria · ADR-0003 vector-DB migration · ADR-0004 AWS migration · ADR-0005 event
bus upgrade · ADR-0006 payments (Stripe vs MoR).
