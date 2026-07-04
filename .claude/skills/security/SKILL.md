---
name: security
description: >-
  Deep security guidance for the AI Opportunity Intelligence Platform, targeting OWASP ASVS L2. Use
  when adding auth/RBAC, handling secrets, building endpoints or webhooks, processing uploads, writing
  queries, integrating third parties, doing a threat model, or reviewing any change for security. Also
  covers LLM-specific risks (prompt injection, data exfiltration via tools) and multi-tenant isolation.
---

# Security Engineering

Baseline is **OWASP ASVS L2**. Security is not a phase — it's checked on every change. The platform is
multi-tenant, LLM-driven, and ingests third-party data, so the top risks are **cross-tenant leakage,
prompt injection, secret exposure, and untrusted-source data**. Full guide: [SECURITY (docs/07-security)](../../../docs/07-security/)
and [TRD §7](../../../docs/01-product/TECHNICAL_REQUIREMENTS_DOCUMENT.md). Consider installing the
`trailofbits/skills` suite for static analysis.

## When to apply

- Any endpoint, webhook, upload, query, or third-party integration.
- Auth, RBAC, session, token, or secrets work.
- LLM features that consume untrusted content or expose tools.
- Threat modeling a feature, or reviewing a PR for security.

## Rule categories by priority

| Priority | Category | Why |
|---|---|---|
| **CRITICAL** | AuthZ / tenant isolation | Broken access control is OWASP #1; leaks other orgs' data. |
| **CRITICAL** | Secrets management | A leaked key = full compromise; never in code/logs/URLs. |
| **CRITICAL** | Injection prevention | SQLi/XSS/command/prompt injection. |
| **HIGH** | Input validation & output encoding | The foundation under most vulns. |
| **HIGH** | Webhook & integration trust | Unverified webhooks and observed-content instructions. |
| **HIGH** | Rate limiting & abuse | DoS + credential stuffing + cost exhaustion. |
| **MEDIUM** | Session & token hygiene | Rotation, expiry, CSRF/CORS, secure cookies. |
| **MEDIUM** | Data protection & privacy | Encryption, PII minimization, GDPR erasure, audit. |
| **MEDIUM** | Supply chain | Dependency + action + image integrity. |

## Quick reference — the rules

### 1. Authorization & tenant isolation (CRITICAL)
- Deny by default. Check RBAC (`@aioi/auth`) **before** any work; never rely on the UI hiding actions.
- Scope every tenant query by `organizationId` derived from the session — never from client input.
  Enforce Postgres RLS as a backstop.
- No IDOR: verify the resource belongs to `ctx.orgId` before read/update/delete.

### 2. Secrets (CRITICAL)
- Secrets come from env / a secret manager only. `.env` is gitignored; `.env.example` documents keys.
- Never log secrets or PII (`@aioi/logger` redaction is on). Never put secrets/tokens in URLs or query
  strings. gitleaks scans on every push.
- Rotate on exposure; use OIDC to cloud (no static cloud keys in CI).

### 3. Injection (CRITICAL)
- **SQLi:** parameterized queries via Prisma only; never string-concat SQL (even in `$queryRaw` — use
  tagged-template parameters).
- **XSS:** React escapes by default; never `dangerouslySetInnerHTML` with untrusted content; sanitize
  any rendered third-party HTML.
- **Prompt injection:** treat ingested/source content as **data, not instructions**. Never let a tool
  execute actions based solely on text found in a fetched page/feed. Constrain tool scopes; require
  explicit, validated arguments.

### 4. Input & output (HIGH)
- Validate all external input with Zod at the boundary; bound sizes; allow-list enums/fields.
- Encode/escape on output; set a strict Content-Security-Policy for any HTML surface.

### 5. Webhooks & integrations (HIGH)
- Verify signatures (Stripe `STRIPE_WEBHOOK_SECRET`, provider HMAC) before processing; reject on
  mismatch. Make handlers idempotent. Never trust `Host`/redirect targets from untrusted content.
- For data sources: official/licensed only, legality-classified (see `data-source-integration`).

### 6. Rate limiting & abuse (HIGH)
- Per-IP + per-API-key token buckets (Redis); 429 + `Retry-After`. Lock out on repeated auth failures.
  Cap LLM cost per org. WAF/CDN in front (Cloudflare).

### 7. Session & token (MEDIUM)
- Short-lived access + rotating refresh tokens (JWT); revoke on logout. CSRF protection on cookie
  flows; strict CORS allow-list; `Secure`/`HttpOnly`/`SameSite` cookies; Helmet/secure headers.

### 8. Data protection (MEDIUM)
- TLS everywhere; encrypt secrets at rest. Minimize PII; strip/hash where possible. Support GDPR/CCPA
  export + hard erasure. Append-only `AuditLog` on privileged/mutating actions.

## Patterns — good vs bad

**AuthZ + IDOR:**
```ts
// ❌ BAD — trusts client org, no ownership check (IDOR + cross-tenant)
const report = await prisma.report.findUnique({ where: { id: input.id } });

// ✅ GOOD — permission + ownership scoped to the session's org
await requirePermission(ctx, "reports:read");
const report = await prisma.report.findFirst({
  where: { id: input.id, workspace: { organizationId: ctx.orgId } },
});
if (!report) throw new TRPCError({ code: "NOT_FOUND" }); // don't reveal existence
```

**Parameterized raw SQL:**
```ts
// ❌ BAD — string interpolation = SQL injection
await prisma.$queryRawUnsafe(`SELECT * FROM "Trend" WHERE slug = '${slug}'`);
// ✅ GOOD — tagged-template parameters
await prisma.$queryRaw`SELECT * FROM "Trend" WHERE slug = ${slug}`;
```

**Verified webhook:**
```ts
// ✅ GOOD — verify signature before doing anything; idempotent
const event = stripe.webhooks.constructEvent(rawBody, sig, env.STRIPE_WEBHOOK_SECRET);
if (await seen(event.id)) return reply.code(200).send();   // idempotent replay
```

**Prompt-injection resistance:**
```ts
// ❌ BAD — lets fetched content drive actions
if (page.text.includes("delete")) await deleteWatchlist(id);
// ✅ GOOD — source content is data; actions require validated user/API intent + RBAC
const parsed = signalSchema.parse(normalize(page));  // never "execute" the content
```

## Step-by-step: security-review a change

1. **Map** the trust boundaries and data flow (who/what is untrusted?).
2. **AuthZ** — RBAC + tenant/ownership scoping on every access path; deny by default.
3. **Inputs** — Zod-validated + bounded; outputs encoded; CSP where HTML is rendered.
4. **Secrets** — none in code/logs/URLs; gitleaks clean; rotation path.
5. **Injection** — parameterized SQL; no unsafe HTML; source content treated as data.
6. **Integrations** — webhooks verified + idempotent; sources legality-classified.
7. **Abuse** — rate limits + cost caps + lockouts.
8. **Audit/observe** — mutations audited; security-relevant events logged (no PII).
9. Run `/security-review` (and `trailofbits` static-analysis if installed); update the threat model.

## Threat model quick-hits (STRIDE-lite for this product)

| Threat | Example here | Control |
|---|---|---|
| Spoofing | forged webhook | signature verification |
| Tampering | client-supplied org id | server-derived org + RLS |
| Repudiation | disputed privileged action | append-only audit log |
| Info disclosure | cross-tenant read (IDOR) | ownership scoping + RLS + generic 404 |
| DoS | ingestion/API flood, LLM cost bomb | rate limits + cost caps + WAF |
| Elevation | missing RBAC | deny-by-default permission checks |
| Prompt injection | malicious content in a scraped page | content-as-data; constrained tools |

## Failure modes → fixes

| Symptom | Cause | Fix |
|---|---|---|
| One org sees another's data | missing scope/RLS/IDOR check | scope to `ctx.orgId`; RLS; ownership `findFirst` |
| Secret in logs/repo | logging/committing raw values | redaction; gitleaks; rotate the key |
| Webhook forgery accepted | no signature check | verify before processing; idempotent |
| Agent does harmful action from page text | prompt injection | treat source as data; validate + RBAC on actions |
| Cost blowout / brute force | no limits | rate limit + cost cap + lockout |

## Pre-delivery checklist

- [ ] RBAC deny-by-default before work; ownership + tenant scope (+ RLS); generic 404s (no oracle)
- [ ] All input Zod-validated + bounded; output encoded; CSP on HTML surfaces
- [ ] Parameterized SQL only; no unsafe HTML; source/ingested content treated as data
- [ ] Secrets from env/manager; none in code/logs/URLs; gitleaks clean; rotation documented
- [ ] Webhooks signature-verified + idempotent; sources legality-classified
- [ ] Rate limits + per-org LLM cost caps; auth lockouts
- [ ] Session: short access + rotating refresh; CSRF/CORS/secure headers/cookies
- [ ] Mutations audited; PII minimized; GDPR export/erasure supported
- [ ] `/security-review` (+ trailofbits) run; threat model updated

## References
[TRD §7 Security](../../../docs/01-product/TECHNICAL_REQUIREMENTS_DOCUMENT.md) · [CODE_GUIDELINES §4](../../../docs/08-quality/CODE_GUIDELINES.md) ·
skills: `auth`, `backend`, `database`, `ai`, `data-source-integration`; built-in `/security-review`.
