# Decisions (project memory)

Durable decisions not obvious from code. Formal ones are ADRs in `docs/adr/`; this is the quick log.

- **Stack**: see ADR-0001 (Fastify, tRPC+REST, Prisma+pgvector, Clerk-behind-adapter, LiteLLM+Langfuse, Vercel+Fly→AWS).
- **Branching**: GitFlow-lite — `main` (stable) · `development` (integration) · `hotfixes`.
- **Releases**: Changesets → Version Packages PR on `main`; packages are private (no npm publish).
- **Data sources**: official/licensed only; no ToS-violating scraping (X/LinkedIn/unofficial Google Trends).
- **AI quality**: no prompt/model/RAG change without a green `llm-eval-harness` run.
