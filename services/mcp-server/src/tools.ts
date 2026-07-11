import type { AioiClient, TrendSummary, TrendDetail } from "./client.js";

/** MCP tool definitions (JSON Schema inputs). */
export const TOOL_SPECS = [
  {
    name: "search_trends",
    description:
      "Search scored AI trends from the AI Opportunity Intelligence platform. Returns an opportunity score (0-100) and the top build idea per trend.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max trends to return (1-100, default 10)." },
        source: {
          type: "string",
          description:
            "Filter to one source: github, hackernews, huggingface, arxiv, youtube, producthunt, reddit.",
        },
        sort: {
          type: "string",
          description: "Score dimension to sort by, highest first (default: opportunity).",
        },
      },
    },
  },
  {
    name: "get_trend",
    description:
      "Get full detail for one trend by slug: 10-dimension scores, momentum, entities, and its build plan (MVP scope, tech stack, pricing).",
    inputSchema: {
      type: "object",
      properties: {
        slug: {
          type: "string",
          description: "The trend slug (the last path segment of a trend's url).",
        },
      },
      required: ["slug"],
    },
  },
  {
    name: "list_build_now_opportunities",
    description:
      "The Golden-Quadrant 'build now' list: trends with high demand and low supply (competition) — the best opportunities to act on right now.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max opportunities to return (1-100, default 10)." },
      },
    },
  },
  {
    name: "search_opportunities",
    description:
      "Keyword-search scored AI opportunities/trends by a query (full-text). Use when the user names a specific area (e.g. 'RAG evaluation', 'voice agents').",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "What to search for." },
        limit: { type: "number", description: "Max results (1-100, default 10)." },
      },
      required: ["query"],
    },
  },
  {
    name: "lookup_entity",
    description:
      "Look up a tracked AI model, MCP server, or repo by exact name (e.g. 'openai/whisper', 'meta-llama/Llama-3') — returns its momentum and the trends that reference it. Useful when reviewing a repo/model.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "The entity name (e.g. a GitHub 'owner/repo' or HF model id).",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "list_rising_entities",
    description:
      "The fastest-accelerating supply-side entities (models / MCP servers / repos) by signal momentum — what builders are moving on right now.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max entities (1-100, default 10)." },
      },
    },
  },
  {
    name: "list_recent_funding",
    description:
      "Recent AI funding rounds (SEC EDGAR Form D + Crunchbase) with the trends each maps to — money moving into a space is a leading demand signal.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max funding events (1-100, default 10)." },
      },
    },
  },
] as const;

function numArg(v: unknown, d: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}
function strArg(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function fmtSummary(t: TrendSummary, i: number): string {
  const dims = Object.entries(t.dimensions)
    .filter(([k]) => k !== "opportunity")
    .map(([k, v]) => `${k} ${v}`)
    .join(", ");
  const idea = t.topIdea ? `\n   idea: ${t.topIdea}` : "";
  return `${i + 1}. ${t.title}\n   opportunity ${t.opportunity ?? "—"} · ${dims}${idea}\n   ${t.url}`;
}

function fmtDetail(t: TrendDetail): string {
  const out: string[] = [`# ${t.title}`];
  if (t.summary) out.push(t.summary);
  const meta = [`status ${t.status}`];
  if (t.momentum) {
    meta.push(
      `momentum ${t.momentum.state} (${t.momentum.delta >= 0 ? "+" : ""}${t.momentum.delta} signals/7d)`,
    );
  }
  out.push(meta.join(" · "));
  out.push(
    `Scores: ${Object.entries(t.scores)
      .map(([k, v]) => `${k} ${v}`)
      .join(", ")}`,
  );
  if (t.entities.length) {
    out.push(`Entities: ${t.entities.map((e) => `${e.name} (${e.type})`).join(", ")}`);
  }
  if (t.plan) {
    out.push("Build plan:");
    if (t.plan.topIdea) out.push(`  idea: ${t.plan.topIdea}`);
    if (t.plan.mvpScope) out.push(`  mvp: ${t.plan.mvpScope}`);
    if (t.plan.techStack?.length) out.push(`  stack: ${t.plan.techStack.join(", ")}`);
    if (t.plan.targetAudience) out.push(`  audience: ${t.plan.targetAudience}`);
    if (t.plan.pricingHint) out.push(`  pricing: ${t.plan.pricingHint}`);
  }
  out.push(t.url);
  return out.join("\n");
}

/** Dispatch + format one tool call to text for the model. */
export async function runTool(
  client: AioiClient,
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  switch (name) {
    case "search_trends": {
      const trends = await client.searchTrends({
        limit: numArg(args.limit, 10),
        source: strArg(args.source),
        sort: strArg(args.sort),
      });
      return trends.length ? trends.map(fmtSummary).join("\n\n") : "No trends found.";
    }
    case "get_trend": {
      const slug = strArg(args.slug);
      if (!slug) return "Error: 'slug' is required.";
      const t = await client.getTrend(slug);
      return t ? fmtDetail(t) : `No trend found for slug "${slug}".`;
    }
    case "list_build_now_opportunities": {
      const opps = await client.listOpportunities({ limit: numArg(args.limit, 10) });
      if (!opps.length) return "No build-now opportunities right now.";
      return opps
        .map(
          (o, i) =>
            `${i + 1}. ${o.title}\n   opportunity ${o.opportunity ?? "—"} · demand ${o.demand} · supply ${o.supply}${
              o.demandSignals ? ` · ${o.demandSignals} wanted` : ""
            }\n   ${o.url}`,
        )
        .join("\n\n");
    }
    case "search_opportunities": {
      const q = strArg(args.query);
      if (!q) return "Error: 'query' is required.";
      const trends = await client.searchOpportunities({ q, limit: numArg(args.limit, 10) });
      return trends.length ? trends.map(fmtSummary).join("\n\n") : `No matches for "${q}".`;
    }
    case "lookup_entity": {
      const entName = strArg(args.name);
      if (!entName) return "Error: 'name' is required.";
      const e = await client.lookupEntity(entName);
      if (!e) return `"${entName}" is not tracked by AI Opportunity Intelligence.`;
      const mo = e.momentum && e.momentum.state !== "new" ? ` · momentum ${e.momentum.state}` : "";
      const trends = e.trends.length ? `\nTrends: ${e.trends.map((t) => t.title).join("; ")}` : "";
      return `${e.name} (${e.type}) — tracked · ${e.linkedTrendCount} trend${e.linkedTrendCount === 1 ? "" : "s"}${mo}${trends}`;
    }
    case "list_rising_entities": {
      const ents = await client.listRisingEntities({ limit: numArg(args.limit, 10) });
      const rising = ents.filter((e) => e.momentum && e.momentum.state === "accelerating");
      const show = rising.length ? rising : ents;
      if (!show.length) return "No tracked entities yet.";
      return show
        .map((e, i) => {
          const d = e.momentum ? ` · ${e.momentum.state} (+${e.momentum.delta})` : "";
          return `${i + 1}. ${e.name} (${e.type}) — ${e.signalWeight} signals · ${e.linkedTrendCount} trends${d}`;
        })
        .join("\n");
    }
    case "list_recent_funding": {
      const events = await client.listRecentFunding({ limit: numArg(args.limit, 10) });
      if (!events.length) return "No funding events available.";
      return events
        .map((f, i) => {
          const t = f.trends.length ? ` → ${f.trends.map((x) => x.title).join("; ")}` : "";
          return `${i + 1}. ${f.issuer}${f.filedAt ? ` (${f.filedAt})` : ""}${t}`;
        })
        .join("\n");
    }
    default:
      return `Unknown tool: ${name}`;
  }
}
