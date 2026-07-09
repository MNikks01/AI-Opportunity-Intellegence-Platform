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
    default:
      return `Unknown tool: ${name}`;
  }
}
