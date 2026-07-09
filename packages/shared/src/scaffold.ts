/**
 * Build kit (B-031): compose a trend + its action plan into a ready-to-paste prompt for an AI coding
 * agent (Claude Code / Cursor / v0). Deterministic — no model call; it reshapes the plan we already
 * generated into a "scaffold this project" brief. The last mile of "signal → shipped".
 */

export interface ScaffoldPlan {
  saasIdeas: string[];
  apiIdeas: string[];
  productNames: string[];
  keywords: string[];
  domainNames: string[];
  targetAudience: string;
  pricingHint: string;
  mvpScope: string;
  techStack: string[];
}

export interface ScaffoldInput {
  title: string;
  summary?: string | null;
  plan: ScaffoldPlan;
}

const first = (xs: string[], fallback: string) => xs[0] ?? fallback;
const bullets = (xs: string[]) => xs.map((x) => `- ${x}`).join("\n");

/** A Markdown scaffold prompt: paste into an AI coding agent to generate the project. */
export function buildScaffoldPrompt(input: ScaffoldInput): string {
  const { title, summary, plan } = input;
  const product = first(plan.productNames, first(plan.saasIdeas, title));
  const idea = first(plan.saasIdeas, title);

  const sections: string[] = [
    `# Build: ${product}`,
    `You are a senior full-stack engineer. Scaffold a production-ready SaaS MVP for the product below. ` +
      `Produce the file structure, key components, a database schema, and a README, then implement the ` +
      `MVP scope. Ask before making irreversible choices; otherwise proceed with sensible defaults.`,
    `## The opportunity\n**${title}**${summary ? `\n\n${summary}` : ""}\n\n**Product concept:** ${idea}`,
    `## Target user\n${plan.targetAudience}`,
    `## MVP scope (build this first)\n${plan.mvpScope}`,
  ];

  if (plan.saasIdeas.length > 1) {
    sections.push(`## Feature ideas\n${bullets(plan.saasIdeas)}`);
  }
  if (plan.apiIdeas.length > 0) {
    sections.push(`## API surface\n${bullets(plan.apiIdeas)}`);
  }
  if (plan.techStack.length > 0) {
    sections.push(`## Tech stack\n${plan.techStack.join(" · ")}`);
  }
  sections.push(`## Monetization\n${plan.pricingHint}`);

  const goToMarket: string[] = [];
  if (plan.productNames.length > 0)
    goToMarket.push(`**Name candidates:** ${plan.productNames.join(", ")}`);
  if (plan.domainNames.length > 0) goToMarket.push(`**Domains:** ${plan.domainNames.join(", ")}`);
  if (plan.keywords.length > 0) goToMarket.push(`**SEO keywords:** ${plan.keywords.join(", ")}`);
  if (goToMarket.length > 0) sections.push(`## Positioning\n${goToMarket.join("\n\n")}`);

  sections.push(
    `## Deliverables\n` +
      bullets([
        "Project scaffold with the tech stack above",
        "Database schema for the MVP entities",
        "The core workflow from the MVP scope, end to end",
        "A README with setup + next steps",
      ]),
  );

  return sections.join("\n\n") + "\n";
}
