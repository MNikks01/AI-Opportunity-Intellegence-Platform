import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./client";
import { ensureSource, listUnclusteredSignals, createTrendFromSignalIds } from "./repositories";

const hasDb = Boolean(process.env.DATABASE_URL);
const sourceKey = `cluster-test-${randomUUID().slice(0, 8)}`;
let sourceId: string;
let sig1: string, sig2: string;
let trendId: string | undefined;

describe.skipIf(!hasDb)("signal clustering helpers (integration)", () => {
  beforeAll(async () => {
    sourceId = await ensureSource(sourceKey);
    const mk = async (externalId: string, title: string) =>
      (await prisma.signal.create({ data: { sourceId, externalId, title, raw: {} } })).id;
    sig1 = await mk("c1", "Cluster seed signal alpha");
    sig2 = await mk("c2", "Cluster seed signal beta");
  });
  afterAll(async () => {
    if (trendId) await prisma.trend.delete({ where: { id: trendId } }).catch(() => {});
    await prisma.source.deleteMany({ where: { key: sourceKey } }).catch(() => {}); // cascades signals
  });

  it("lists unclustered signals, then clusters them into a trend", async () => {
    const before = await listUnclusteredSignals(1000);
    expect(before.some((s) => s.id === sig1)).toBe(true);

    trendId = await createTrendFromSignalIds([sig1, sig2], "Cluster test trend");
    const links = await prisma.trendSignal.findMany({ where: { trendId } });
    expect(links.map((l) => l.signalId).sort()).toEqual([sig1, sig2].sort());

    const after = await listUnclusteredSignals(1000);
    expect(after.some((s) => s.id === sig1)).toBe(false); // now attached to a trend
  });
});
