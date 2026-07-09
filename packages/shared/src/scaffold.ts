/**
 * Build kit (B-031): compose a trend + its action plan into a ready-to-paste prompt for an AI coding
 * agent (Claude Code / Cursor / v0). Deterministic — no model call; it reshapes the plan we already
 * generated into a rigorous "scaffold this project" brief (role → task → requirements → standards →
 * definition of done), the structure a senior engineer would want. The last mile of "signal → shipped".
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

/** A structured Markdown scaffold prompt: paste into an AI coding agent to generate the project. */
export function buildScaffoldPrompt(input: ScaffoldInput): string {
  const { title, summary, plan } = input;
  const product = first(plan.productNames, first(plan.saasIdeas, title));
  const idea = first(plan.saasIdeas, title);

  const sections: string[] = [];

  sections.push(
    `# ROLE\n` +
      `You are a Staff Software Engineer (system design, backend & frontend architecture, TypeScript, ` +
      `Node.js, React/Next.js, security, performance, testing). Think before coding: inspect what already ` +
      `exists, reuse existing abstractions, never duplicate code, and keep changes minimal.`,
  );

  sections.push(`# TASK\nScaffold and build a production-ready MVP of **${product}** — ${idea}.`);

  sections.push(
    `# CONTEXT — the opportunity\n` +
      `This product targets a live opportunity surfaced from the AI ecosystem:\n\n` +
      `**${title}**${summary ? `\n\n${summary}` : ""}`,
  );

  const goals = [
    `A user can: ${plan.mvpScope}`,
    ...plan.saasIdeas.slice(0, 4).map((s) => `Ship: ${s}`),
  ];
  goals.push("The app is production-ready: typed, tested, secure, and deployable.");
  sections.push(`# GOAL / SUCCESS CRITERIA\n${bullets(goals)}`);

  sections.push(`# TARGET USERS\n${plan.targetAudience}`);

  const functional = [...plan.saasIdeas];
  if (plan.apiIdeas.length > 0) functional.push(`Expose an API: ${plan.apiIdeas.join("; ")}`);
  sections.push(
    `# REQUIREMENTS\n## Functional\n${bullets(functional)}\n\n## Non-functional\n` +
      bullets([
        "Clean, feature-first architecture",
        "Fully type-safe (no `any` at boundaries)",
        "Reusable and easy to extend",
        "Production-ready",
      ]),
  );

  sections.push(
    `# TECH STACK\n` +
      (plan.techStack.length > 0
        ? plan.techStack.join(" · ")
        : "Propose a modern, type-safe stack (default: Next.js App Router + TypeScript + PostgreSQL/Prisma) and justify it."),
  );

  sections.push(`# MONETIZATION\n${plan.pricingHint}`);

  const positioning: string[] = [];
  if (plan.productNames.length > 0)
    positioning.push(`**Name candidates:** ${plan.productNames.join(", ")}`);
  if (plan.domainNames.length > 0) positioning.push(`**Domains:** ${plan.domainNames.join(", ")}`);
  if (plan.keywords.length > 0) positioning.push(`**SEO keywords:** ${plan.keywords.join(", ")}`);
  if (positioning.length > 0) sections.push(`# POSITIONING\n${positioning.join("\n\n")}`);

  sections.push(
    `# CONSTRAINTS\n` +
      bullets([
        "No unnecessary dependencies and no deprecated APIs.",
        "Follow the project's conventions; keep changes minimal.",
        "Don't create duplicate utilities; don't rewrite unrelated code.",
      ]),
  );

  sections.push(
    `# CODING STANDARDS\n` +
      "SOLID · DRY · KISS · Clean Architecture · feature-first organization · strong typing · async/await · " +
      "proper error handling · input validation · logging.",
  );

  sections.push(
    `# SECURITY\n` +
      "Authentication & authorization; validate all input; guard against SQL injection, XSS, and CSRF; " +
      "rate limiting; secure headers; secrets via environment variables.",
  );

  sections.push(
    `# PERFORMANCE\n` +
      "Efficient database queries; cache where it helps; lazy loading and code splitting; minimal " +
      "re-renders; keep an eye on bundle size.",
  );

  sections.push(
    `# UX\n` +
      "Loading, error, and empty states; responsive; accessible (keyboard navigation, ARIA); dark-mode compatible.",
  );

  sections.push(
    `# BEFORE WRITING CODE\n` +
      bullets([
        "Restate your understanding of the task.",
        "Inspect the environment and find existing patterns to reuse.",
        "Present a concise implementation plan: files, architecture decisions, trade-offs, risks.",
        "Call out assumptions; ask before irreversible or major architectural changes.",
        "Only then implement.",
      ]),
  );

  sections.push(
    `# DELIVERABLES\n` +
      bullets([
        "Project scaffold using the tech stack above.",
        "Database schema for the MVP entities.",
        "The core workflow from the MVP scope, working end to end.",
        "Tests for the critical paths.",
        "A README with setup + next steps.",
      ]),
  );

  sections.push(
    `# DEFINITION OF DONE\n` +
      bullets([
        "All functional requirements implemented; the MVP scope works end to end.",
        "Build, typecheck, and lint pass; no console or type errors.",
        "Edge cases handled; secure by default; documentation updated.",
      ]),
  );

  sections.push(
    `# DECISION PRIORITY\n` +
      "When trade-offs conflict, prioritize: Correctness → Security → Maintainability → Performance → " +
      "Developer experience → Convenience.",
  );

  return sections.join("\n\n") + "\n";
}
