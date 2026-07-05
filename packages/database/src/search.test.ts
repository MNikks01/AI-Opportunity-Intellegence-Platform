import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./client";
import { searchTrends } from "./repositories";

// Integration — needs a live Postgres (the generated tsvector + GIN index). Trend is global (no RLS).
const hasDb = Boolean(process.env.DATABASE_URL);
const slugs: string[] = [];

async function mk(title: string, summary: string): Promise<void> {
  const slug = `t-${randomUUID().slice(0, 8)}`;
  await prisma.trend.create({ data: { slug, title, summary } });
  slugs.push(slug);
}

describe.skipIf(!hasDb)("searchTrends (integration)", () => {
  beforeAll(async () => {
    await mk("Agentic RAG frameworks", "Retrieval augmented generation with autonomous agents");
    await mk("Vector databases", "pgvector similarity search for embeddings");
    await mk("On-device LLM inference", "Running quantized models locally");
  });
  afterAll(async () => {
    for (const s of slugs) await prisma.trend.delete({ where: { slug: s } }).catch(() => {});
  });

  it("matches by title keyword", async () => {
    const res = await searchTrends("agentic rag");
    expect(res.some((t) => t.title === "Agentic RAG frameworks")).toBe(true);
  });

  it("matches text in the summary", async () => {
    const res = await searchTrends("pgvector");
    expect(res.some((t) => t.title === "Vector databases")).toBe(true);
  });

  it("returns TrendView shape (with scores array)", async () => {
    const res = await searchTrends("quantized");
    expect(res[0]).toMatchObject({ title: "On-device LLM inference" });
    expect(Array.isArray(res[0]!.scores)).toBe(true);
  });

  it("returns empty for no match and for a blank query", async () => {
    expect(await searchTrends("zzzznomatchqxz")).toHaveLength(0);
    expect(await searchTrends("   ")).toHaveLength(0);
  });
});
