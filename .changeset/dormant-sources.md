---
"@aioi/web": minor
---

Dormant-source indicator on /sources + a CSS syntax fix. The Sources page now shows the full
connector catalog with each source's status — Live (signal count), Idle (awaiting next run), or
"Needs setup" (naming the env var), so operators can see which key-gated sources (Reddit / YouTube /
Product Hunt) are dormant and why. Also fixes a merge-introduced unbalanced-brace in globals.css that
had silently broken all CSS after the referrals block (onboarding, referrals, report).
