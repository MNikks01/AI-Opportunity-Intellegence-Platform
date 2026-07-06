import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { prisma } from "./client";
import { reembedAllTrends } from "./repositories";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)("reembedAllTrends (integration)", () => {
  it("sets an embedding on a trend that had none", async () => {
    const slug = `reembed-${randomUUID().slice(0, 8)}`;
    const trend = await prisma.trend.create({
      data: { slug, title: "Reembed test trend", status: "ACTIVE", lastSignalAt: new Date() },
    });
    // simulate a pre-embedding trend
    await prisma.$executeRaw`UPDATE "Trend" SET embedding = NULL WHERE id = ${trend.id}::uuid`;

    const res = await reembedAllTrends();
    expect(res.embedded).toBeGreaterThan(0);
    expect(res.total).toBeGreaterThanOrEqual(res.embedded);

    const rows = await prisma.$queryRaw<
      { has: boolean }[]
    >`SELECT (embedding IS NOT NULL) AS has FROM "Trend" WHERE id = ${trend.id}::uuid`;
    expect(rows[0]?.has).toBe(true);

    await prisma.trend.delete({ where: { id: trend.id } }).catch(() => {});
  });
});
