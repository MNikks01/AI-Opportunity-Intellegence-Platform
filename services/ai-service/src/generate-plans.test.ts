import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { StubProvider } from "@aioi/ai-sdk";
import { createTrendFromSignalIds, ensureSource, getActionPlan, prisma } from "@aioi/database";
import { generateActionPlansForTopTrends } from "./action-plan";

const enabled = Boolean(process.env.DATABASE_URL);
const sourceKey = `plan-test-${randomUUID().slice(0, 8)}`;
let trendId: string | undefined;

describe.skipIf(!enabled)("generateActionPlansForTopTrends (integration)", () => {
  afterAll(async () => {
    if (trendId) await prisma.trend.delete({ where: { id: trendId } }).catch(() => {});
    await prisma.source.deleteMany({ where: { key: sourceKey } }).catch(() => {});
  });

  it("generates + persists a plan for a top scored trend that has none", async () => {
    const sourceId = await ensureSource(sourceKey);
    const sig = await prisma.signal.create({
      data: { sourceId, externalId: "p1", title: "agentic RAG frameworks", raw: {} },
    });
    trendId = await createTrendFromSignalIds([sig.id], "Agentic RAG frameworks");
    // Opportunity 95 so a high threshold isolates this trend from the shared test DB.
    await prisma.score.create({
      data: { trendId, dimension: "OPPORTUNITY", value: 95, band: "HIGH", confidence: 0.8, rationale: "x", evidence: [], rubricVersion: "test" }, // prettier-ignore
    });

    expect(await getActionPlan(trendId)).toBeNull();
    const res = await generateActionPlansForTopTrends({
      limit: 50,
      minOpportunity: 90,
      provider: new StubProvider(),
    });
    expect(res.generated).toBeGreaterThanOrEqual(1);

    // idempotent: a second run finds nothing new to plan for this trend
    const again = await generateActionPlansForTopTrends({
      limit: 50,
      minOpportunity: 90,
      provider: new StubProvider(),
    });
    expect(again.candidates).toBe(0);

    const plan = await getActionPlan(trendId);
    expect(plan).not.toBeNull();
    const content = plan!.content as { saasIdeas: string[] };
    expect(content.saasIdeas.length).toBeGreaterThan(0);
  });
});
