---
"@aioi/ai-sdk": minor
---

Support calling a provider directly (no gateway): the LiteLLM client/embedder accept an optional bearer
token from `AIOI_LLM_API_KEY`, so `LITELLM_BASE_URL=https://api.openai.com/v1` + `AIOI_LLM_API_KEY=sk-…`
does real embeddings + scoring in serverless/CI without hosting a LiteLLM proxy. Local proxy flow is
unchanged (no key → no auth header). Verified live against OpenAI.
