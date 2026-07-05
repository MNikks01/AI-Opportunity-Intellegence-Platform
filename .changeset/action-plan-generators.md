---
"@aioi/ai-sdk": minor
"@aioi/ai-service": minor
"@aioi/database": minor
"@aioi/api": minor
"@aioi/validation": minor
"@aioi/web": minor
---

Action-plan generators (B-021): `generateActionPlan` in `@aioi/ai-sdk` (Stub + LiteLLM, schema-validated)

- `@aioi/ai-service` orchestration, `persistActionPlan`/`getActionPlan` with `getTrendBySlug` including
  the plan, an admin-gated `trends.generateActionPlan` mutation, and a plan section on the trend detail
  page. Also adds `main`/`types` to `@aioi/ai-service` so it can be imported.
