# Data source: Stack Exchange (Stack Overflow)

**Connector:** `services/ingestion-service/src/connectors/stackexchange.ts`
**Source key:** `stackexchange` · **Legality tier:** ✅ OFFICIAL
**Auth:** optional `STACKEXCHANGE_KEY` · **PII:** none · **Cadence:** every 4h

Public API (`api.stackexchange.com/2.3`). A burst of new questions on an AI tag is a leading
**demand / pain** signal — developers hit a wall and ask before a tool exists to solve it. We poll the
newest questions across a set of AI tags (`artificial-intelligence`, `large-language-model`, `openai-api`,
`langchain`, `llama`, `huggingface-transformers`), one request per tag (Stack Exchange `tagged` is AND,
so tags can't be OR-ed in a single call), and dedupe questions that appear under multiple tags.

Keyless access allows **300 requests/day per IP**; `STACKEXCHANGE_KEY` raises it to 10k. At 6 tags every
4h that's 36 requests/day — comfortably within the keyless budget. Content is CC BY-SA; attribution is
preserved via the stored question `url`. Responses are always gzipped (the fetch runtime decompresses
transparently). Backoff + jitter honors `Retry-After`. ToS: https://api.stackexchange.com/docs
(reviewed 2026-07-14).
