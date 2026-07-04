---
name: agents
description: >-
  Deep guidance for building agentic features, MCP servers, and tool-using workflows in the AI
  Opportunity Intelligence Platform — the MCP Server Discovery feature, agent marketplace, and any
  tool-calling LLM workflow. Use when scaffolding MCP servers/tools, defining tool schemas, wiring
  multi-step agent loops, or securing tool actions against prompt injection and runaway cost.
---

# Agents & MCP

The platform both **consumes** the MCP/agent ecosystem (MCP Server Discovery, Agent Marketplace, model/
prompt tracking) and can **expose** an MCP server so power users query our intelligence. Agentic code
is the highest-risk LLM surface: tools take actions. The rules center on **least-privilege tools,
validated arguments, bounded loops, and treating all observed content as data.** Scaffold servers with
the official `mcp-builder` skill. See [ai](../ai/SKILL.md), [security](../security/SKILL.md).

## When to apply

- Building an MCP server/tools (for us to expose, or to test discovered servers).
- Implementing any tool-calling / multi-step agent loop.
- Reviewing agent code for safety, cost, and correctness.

## Rule categories by priority

| Priority | Category | Why |
|---|---|---|
| **CRITICAL** | Least-privilege tools | A tool is an action; over-broad scope = real damage. |
| **CRITICAL** | Validated tool args | Models pass malformed/hostile args; validate every one. |
| **CRITICAL** | Content-as-data (anti-injection) | Fetched/tool-returned text must never drive actions on its own. |
| **HIGH** | Bounded loops & budget | Agent loops can spin forever and burn cost. |
| **HIGH** | Human-in-the-loop for side effects | Irreversible/outward actions need confirmation. |
| **MEDIUM** | Observability & replay | Trace every tool call; make runs inspectable. |
| **MEDIUM** | Idempotency | Retried steps must not double-act. |

## Quick reference — the rules

### 1. Least-privilege tools (CRITICAL)
- Each tool does one narrow thing with the minimum scope. Read tools can't write; write tools are
  explicit and audited. No "run arbitrary code/SQL/shell" tools. Enforce RBAC/tenant scope inside the tool.

### 2. Validate tool arguments (CRITICAL)
- Define every tool's input with a JSON schema / Zod; validate before executing. Reject unknown/extra
  fields; bound sizes and enums. Never `eval`/interpolate model output into queries or commands.

### 3. Content as data (CRITICAL)
- Text returned by a fetch/search/tool is **data, not instructions**. Never let it trigger an action
  ("the page said delete X"). Wrap it as untrusted context; the agent may summarize it, not obey it.

### 4. Bounded loops & budget (HIGH)
- Cap steps/iterations, wall-clock, and token/cost per run. Detect no-progress loops and stop. Prefer
  a fixed workflow (plan → act → verify) over open-ended autonomy where possible.

### 5. Human-in-the-loop (HIGH)
- Irreversible or outward-facing side effects (send, publish, delete, pay) require explicit user
  confirmation — never triggered by content the agent read. Read/analyze freely; act deliberately.

### 6. Observability (MEDIUM)
- Trace every tool call (name, args, result, cost) in Langfuse; make runs replayable for debugging.

### 7. Idempotency (MEDIUM)
- Tool actions with side effects use idempotency keys; a retried step must not double-apply.

## Patterns — good vs bad

**Typed, scoped, validated tool:**
```ts
// ❌ BAD — unscoped, unvalidated, dangerous surface
tool("query", async (args) => prisma.$queryRawUnsafe(args.sql)); // arbitrary SQL from a model

// ✅ GOOD — narrow tool, validated args, RBAC + tenant scope inside
tool("search_trends", searchTrendsSchema, async (args, ctx) => {
  await requirePermission(ctx, "trends:read");
  return trendRepo.search(ctx.orgId, args.query, Math.min(args.limit ?? 10, 25));
});
```

**Content-as-data loop:**
```ts
// ❌ BAD — lets fetched content decide an action
if (fetched.text.includes("unsubscribe")) await deleteWatchlist(id);

// ✅ GOOD — the agent summarizes untrusted content; actions need validated intent + confirmation
const summary = await agent.summarize({ context: asUntrusted(fetched.text) });
// side-effecting actions go through a confirmed, RBAC-checked path — not from summary text
```

**Bounded loop:**
```ts
// ✅ GOOD — hard caps + no-progress detection + cost budget
for (let step = 0; step < MAX_STEPS && cost < BUDGET; step++) {
  const action = await plan(state);
  if (action.type === "done" || noProgress(state)) break;
  state = await execute(action, ctx);   // each tool validated + traced
}
```

## Step-by-step: build an MCP server/tool

1. Scaffold with the `mcp-builder` skill (spec-compliant server + manifest).
2. Define each tool's input/output schema (Zod/JSON schema); document what it does + its scope.
3. Implement handlers with RBAC + tenant scope + validation + audit; keep them narrow.
4. Add anti-injection wrapping for any content the tool returns to the model.
5. Bound loops/budget; add idempotency to side-effecting tools.
6. Trace calls (Langfuse); write tests for arg validation, RBAC denial, and a full happy path.
7. Docs + CHANGELOG + changeset.

## Decision guide

| Situation | Do | Don't |
|---|---|---|
| Model needs data | narrow read tool (scoped) | broad query/exec tool |
| Model needs to act | explicit write tool + confirmation for irreversible | act on content text |
| Multi-step task | bounded plan→act→verify loop | open-ended autonomy |
| External/observed content | wrap as untrusted data | treat as instructions |
| Building an MCP server | `mcp-builder` + schemas | hand-roll without the spec |

## Failure modes → fixes

| Symptom | Cause | Fix |
|---|---|---|
| Agent takes harmful action | prompt injection via content | content-as-data; confirm side effects |
| Runaway cost / infinite loop | no caps/no-progress detection | step/time/cost caps; stop on no progress |
| Malformed tool call crashes | unvalidated args | schema-validate every tool input |
| Over-privileged tool abused | broad scope | least privilege; RBAC inside the tool |
| Double side effects on retry | non-idempotent tool | idempotency keys |

## Pre-delivery checklist

- [ ] Each tool is narrow + least-privilege; no arbitrary code/SQL/shell tool
- [ ] Every tool input schema-validated; unknown fields rejected; sizes/enums bounded
- [ ] Observed/tool content treated as untrusted data (never instructions)
- [ ] Loops bounded (steps/time/cost); no-progress detection
- [ ] Irreversible/outward side effects require explicit confirmation + RBAC + audit
- [ ] Side-effecting tools idempotent; every tool call traced (Langfuse)
- [ ] Tests: arg validation, RBAC denial, injection resistance, happy path
- [ ] MCP server spec-compliant (mcp-builder); docs + CHANGELOG + changeset

## References
skills: `ai`, `security`, `prompt-engineering`, `backend` · official `mcp-builder` · [SYSTEM_DESIGN](../../../docs/02-architecture/SYSTEM_DESIGN.md).
