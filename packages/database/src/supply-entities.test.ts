import { describe, expect, it } from "vitest";
import { prisma, classifyGitHubEntity, supplyEntityFromSignal, syncSupplyEntities } from "./index";

// --- Pure unit tests (no DB) ---
describe("classifyGitHubEntity", () => {
  it("flags MCP servers by topic, whole-word name, or protocol name", () => {
    expect(classifyGitHubEntity({ name: "acme/weather", topics: ["mcp"] })).toBe("MCP_SERVER");
    expect(classifyGitHubEntity({ name: "acme/weather-mcp" })).toBe("MCP_SERVER");
    expect(
      classifyGitHubEntity({ name: "acme/tool", description: "A Model Context Protocol server" }),
    ).toBe("MCP_SERVER");
  });

  it("does not false-positive on substrings or unrelated repos", () => {
    expect(classifyGitHubEntity({ name: "mcphersons/store" })).toBe("REPO");
    expect(classifyGitHubEntity({ name: "acme/next", description: "A web framework" })).toBe(
      "REPO",
    );
    expect(classifyGitHubEntity({ name: "acme/x", topics: ["ai", "llm"] })).toBe("REPO");
  });
});

describe("supplyEntityFromSignal", () => {
  it("maps HF → MODEL and GitHub → REPO/MCP_SERVER; ignores other sources", () => {
    expect(supplyEntityFromSignal("huggingface", "meta/llama-3", { id: "meta/llama-3" })).toEqual({
      type: "MODEL",
      name: "meta/llama-3",
    });
    expect(
      supplyEntityFromSignal("github", "acme/srv", { full_name: "acme/srv", topics: ["mcp"] }),
    ).toEqual({ type: "MCP_SERVER", name: "acme/srv" });
    expect(supplyEntityFromSignal("github", "acme/lib", { full_name: "acme/lib" })).toEqual({
      type: "REPO",
      name: "acme/lib",
    });
    expect(supplyEntityFromSignal("hackernews", "Some story", {})).toBeNull();
    expect(supplyEntityFromSignal("huggingface", null, {})).toBeNull();
  });
});

// --- DB-integration (guarded) ---
const enabled = Boolean(process.env.DATABASE_URL);

describe.skipIf(!enabled)("syncSupplyEntities (integration)", () => {
  it("upserts model/repo entities from HF+GitHub signals and links them to trends", async () => {
    const suffix = Date.now();
    // The huggingface/github sources are global + unique-keyed and may already exist — upsert them.
    const hf = await prisma.source.upsert({
      where: { key: "huggingface" },
      create: { key: "huggingface", legalityTier: "OFFICIAL", rateConfig: {} },
      update: {},
    });
    const gh = await prisma.source.upsert({
      where: { key: "github" },
      create: { key: "github", legalityTier: "OFFICIAL", rateConfig: {} },
      update: {},
    });
    const trend = await prisma.trend.create({
      data: { slug: `se-${suffix}`, title: "Supply entity trend" },
    });
    const modelName = `org/model-${suffix}`;
    const repoName = `org/mcp-server-${suffix}`;
    const modelSig = await prisma.signal.create({
      data: { sourceId: hf.id, externalId: modelName, title: modelName, raw: { id: modelName } },
    });
    const repoSig = await prisma.signal.create({
      data: {
        sourceId: gh.id,
        externalId: `r-${suffix}`,
        title: repoName,
        raw: { full_name: repoName, topics: ["mcp"] },
      },
    });
    await prisma.trendSignal.create({ data: { trendId: trend.id, signalId: modelSig.id } });
    await prisma.trendSignal.create({ data: { trendId: trend.id, signalId: repoSig.id } });

    const res = await syncSupplyEntities({ limit: 50 });
    expect(res.upserted).toBeGreaterThanOrEqual(2);

    const model = await prisma.entity.findFirst({ where: { type: "MODEL", name: modelName } });
    const mcp = await prisma.entity.findFirst({ where: { type: "MCP_SERVER", name: repoName } });
    expect(model).toBeTruthy();
    expect(mcp).toBeTruthy();
    // linked to the trend
    const link = await prisma.trendEntity.findFirst({
      where: { trendId: trend.id, entityId: model!.id },
    });
    expect(link).toBeTruthy();

    // idempotent: a second run creates no duplicate entity
    await syncSupplyEntities({ limit: 50 });
    const models = await prisma.entity.count({ where: { type: "MODEL", name: modelName } });
    expect(models).toBe(1);

    await prisma.entity.deleteMany({ where: { name: { in: [modelName, repoName] } } });
    await prisma.trend.delete({ where: { id: trend.id } });
    await prisma.signal.deleteMany({ where: { id: { in: [modelSig.id, repoSig.id] } } });
    // Sources are global (may pre-exist) — leave them.
  });
});
