/**
 * Curated, product-facing "what's new" entries. This is deliberately *not* the repository CHANGELOG
 * (engineering release notes) — it's written for users, in plain language. Add newest first.
 */
export type ChangeTag = "New" | "Improved" | "Fixed";

export interface ChangelogEntry {
  date: string; // ISO yyyy-mm-dd
  tag: ChangeTag;
  title: string;
  body: string;
}

export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    date: "2026-07-09",
    tag: "New",
    title: "RSS feed of the newest opportunities",
    body: "Subscribe to /feed.xml in any reader — or wire it into Zapier/n8n — to get every newly-scored opportunity as it lands, with its score and a build idea.",
  },
  {
    date: "2026-07-09",
    tag: "Improved",
    title: "Related opportunities on every trend",
    body: "Each trend now shows the ones most like it — both trends that share the same companies and models, and others that are simply similar in meaning — so there's always a next thing to explore.",
  },
  {
    date: "2026-07-08",
    tag: "New",
    title: "Usage dashboard on Billing",
    body: "See exactly what you're using against your plan — watchlists, alerts, seats, and API calls — with a 14-day history of your API usage.",
  },
  {
    date: "2026-07-08",
    tag: "New",
    title: "Team plan & annual billing",
    body: "A new Team plan adds 25 seats and the highest API limits. Every paid plan can now be billed annually with two months free.",
  },
  {
    date: "2026-07-07",
    tag: "New",
    title: "Plans, upgrades & self-serve billing",
    body: "Free, Pro, and Team plans with clear limits, a pricing page, and one-click upgrade/downgrade through Stripe. Your plan's limits are enforced everywhere and shown as you approach them.",
  },
  {
    date: "2026-07-06",
    tag: "New",
    title: "Programmatic access — API keys, public API & MCP",
    body: "Create API keys and query opportunities from your own code, or connect the MCP server so a coding agent (Claude, Cursor) can pull live opportunities directly.",
  },
  {
    date: "2026-07-05",
    tag: "New",
    title: "Team seats, roles & Slack/Discord digests",
    body: "Invite teammates with roles, and pipe the daily brief into your team's Slack or Discord.",
  },
  {
    date: "2026-07-04",
    tag: "New",
    title: "Two more sources: arXiv & npm",
    body: "Research papers (arXiv) and package adoption (npm) are now part of the signal — both early indicators that precede products.",
  },
  {
    date: "2026-07-03",
    tag: "New",
    title: "The State of AI Opportunities report",
    body: "A shareable snapshot of the whole landscape — top opportunities, the Golden Quadrant, momentum leaders, and the most-tracked companies and models.",
  },
  {
    date: "2026-07-02",
    tag: "New",
    title: "Build kit — from signal to code",
    body: "Turn any opportunity's plan into a rigorous, ready-to-paste prompt for your AI coding agent, with copy and download. The last mile from idea to running code.",
  },
  {
    date: "2026-07-01",
    tag: "New",
    title: "The Golden Quadrant & momentum",
    body: "See every trend plotted on demand × supply, with the high-demand / low-supply 'build now' region highlighted — plus a momentum sparkline on every card so you can spot what's accelerating.",
  },
];
