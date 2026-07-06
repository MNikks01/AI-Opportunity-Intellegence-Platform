import { afterEach, describe, expect, it } from "vitest";
import { InMemorySignalRepository, runRedditIngestion } from "./index";

describe("runRedditIngestion", () => {
  const saved = {
    id: process.env.REDDIT_CLIENT_ID,
    secret: process.env.REDDIT_CLIENT_SECRET,
  };
  afterEach(() => {
    if (saved.id) process.env.REDDIT_CLIENT_ID = saved.id;
    else delete process.env.REDDIT_CLIENT_ID;
    if (saved.secret) process.env.REDDIT_CLIENT_SECRET = saved.secret;
    else delete process.env.REDDIT_CLIENT_SECRET;
  });

  it("no-ops (no fetch, no writes) when Reddit is not configured", async () => {
    delete process.env.REDDIT_CLIENT_ID;
    delete process.env.REDDIT_CLIENT_SECRET;
    const repo = new InMemorySignalRepository();
    const res = await runRedditIngestion(25, repo);
    expect(res).toEqual({ fetched: 0, inserted: 0, skipped: 0 });
    expect(repo.records).toHaveLength(0);
  });
});
