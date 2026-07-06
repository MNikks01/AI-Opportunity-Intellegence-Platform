---
"@aioi/ai-sdk": minor
---

Auto-select the scoring model to match the configured provider key (`defaultChatModel`): Anthropic →
claude-opus-4-8, OpenAI → gpt-4o-mini, `AIOI_SCORING_MODEL` always wins. Previously the default was
Anthropic-specific, so a user with only an OpenAI key got a real provider that 401'd. Now one key just
works.
