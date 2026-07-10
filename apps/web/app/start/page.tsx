import type { Metadata } from "next";
import { countWatchlists, countAlerts, listApiKeys, getOrgIntegration } from "@aioi/database";
import { getDevOrg } from "../lib/dev-org";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Get started",
  description: "A quick checklist to set up your AI Opportunity Intelligence workspace.",
};

interface Step {
  title: string;
  body: string;
  cta: { label: string; href: string };
  done: boolean;
}

export default async function StartPage() {
  const { organizationId } = await getDevOrg();
  const [watchlists, alerts, apiKeys, integration] = await Promise.all([
    countWatchlists(organizationId),
    countAlerts(organizationId),
    listApiKeys(organizationId),
    getOrgIntegration(organizationId),
  ]);
  const hasDigest = Boolean(integration?.slackWebhookUrl || integration?.discordWebhookUrl);

  const steps: Step[] = [
    {
      title: "Create your first watchlist",
      body: "Track the trends, entities, and topics you care about so they're one click away.",
      cta: { label: "Create a watchlist →", href: "/watchlists" },
      done: watchlists > 0,
    },
    {
      title: "Set an alert",
      body: "Get notified when a watched trend breaks out — a new match, or a score crossing your threshold.",
      cta: { label: "Add an alert →", href: "/watchlists" },
      done: alerts > 0,
    },
    {
      title: "Create an API key",
      body: "Query opportunities from your own code or an AI agent via the public API and MCP server.",
      cta: { label: "Create a key →", href: "/team" },
      done: apiKeys.length > 0,
    },
    {
      title: "Connect a team digest",
      body: "Pipe the daily brief into your team's Slack or Discord so everyone sees what's breaking out.",
      cta: { label: "Connect Slack/Discord →", href: "/team" },
      done: hasDigest,
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  const allDone = completed === steps.length;

  return (
    <main className="onboard">
      <header className="onboard-head">
        <span className="onboard-eyebrow">Get started</span>
        <h1>Set up your workspace</h1>
        <p>
          A few steps to get the most out of the platform. Want to just look around?{" "}
          <a href="/trends">Browse trends</a> or see the <a href="/quadrant">Golden Quadrant</a>.
        </p>
        <div className="onboard-progress" aria-label={`${completed} of ${steps.length} complete`}>
          <div className="onboard-progress-track">
            <div
              className="onboard-progress-fill"
              style={{ width: `${(completed / steps.length) * 100}%` }}
            />
          </div>
          <span className="onboard-progress-label">
            {completed} / {steps.length}
          </span>
        </div>
      </header>

      {allDone && (
        <p className="onboard-done" role="status">
          🎉 You&rsquo;re all set — your workspace is fully configured. Head to{" "}
          <a href="/trends">the trends</a> and find your next thing to build.
        </p>
      )}

      <ol className="onboard-list">
        {steps.map((s, i) => (
          <li key={s.title} className={`onboard-step${s.done ? " is-done" : ""}`}>
            <span className="onboard-check" aria-hidden>
              {s.done ? "✓" : i + 1}
            </span>
            <div className="onboard-step-body">
              <h3>{s.title}</h3>
              <p>{s.body}</p>
              {!s.done && (
                <a className="onboard-step-cta" href={s.cta.href}>
                  {s.cta.label}
                </a>
              )}
            </div>
          </li>
        ))}
      </ol>
    </main>
  );
}
