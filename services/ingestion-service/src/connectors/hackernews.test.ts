import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { fetchTopStories } from "./hackernews";
import { InMemorySignalRepository } from "../repository";

const server = setupServer();
const noSleep = () => Promise.resolve();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const HN = "https://hacker-news.firebaseio.com/v0";
const story = (id: number, title = `story ${id}`) => ({
  id,
  type: "story",
  by: "someone",
  time: 1_700_000_000,
  title,
  url: `https://example.com/${id}`,
  score: 100,
});

describe("hackernews connector", () => {
  it("happy path: normalizes top stories", async () => {
    server.use(
      http.get(`${HN}/topstories.json`, () => HttpResponse.json([1, 2])),
      http.get(`${HN}/item/1.json`, () => HttpResponse.json(story(1))),
      http.get(`${HN}/item/2.json`, () => HttpResponse.json(story(2))),
    );
    const { records, skipped } = await fetchTopStories(2, { sleep: noSleep });
    expect(records).toHaveLength(2);
    expect(skipped).toBe(0);
    expect(records[0]).toMatchObject({ source: "hackernews", externalId: "1", title: "story 1" });
    expect(records[0]?.publishedAt).toBe(new Date(1_700_000_000 * 1000).toISOString());
  });

  it("skips malformed items without crashing", async () => {
    server.use(
      http.get(`${HN}/topstories.json`, () => HttpResponse.json([1, 2])),
      http.get(`${HN}/item/1.json`, () => HttpResponse.json(story(1))),
      http.get(`${HN}/item/2.json`, () => HttpResponse.json({ not: "an item" })),
    );
    const { records, skipped } = await fetchTopStories(2, { sleep: noSleep });
    expect(records).toHaveLength(1);
    expect(skipped).toBe(1);
  });

  it("retries on 429 then succeeds (honors backoff)", async () => {
    let calls = 0;
    server.use(
      http.get(`${HN}/topstories.json`, () => HttpResponse.json([1])),
      http.get(`${HN}/item/1.json`, () => {
        calls += 1;
        if (calls === 1) return new HttpResponse(null, { status: 429, headers: { "retry-after": "0" } });
        return HttpResponse.json(story(1));
      }),
    );
    const { records } = await fetchTopStories(1, { sleep: noSleep });
    expect(calls).toBe(2);
    expect(records).toHaveLength(1);
  });

  it("empty result yields no records", async () => {
    server.use(http.get(`${HN}/topstories.json`, () => HttpResponse.json([])));
    const { records, skipped } = await fetchTopStories(10, { sleep: noSleep });
    expect(records).toHaveLength(0);
    expect(skipped).toBe(0);
  });

  it("upserts idempotently (dedupe by source+externalId)", async () => {
    server.use(
      http.get(`${HN}/topstories.json`, () => HttpResponse.json([1, 2])),
      http.get(`${HN}/item/1.json`, () => HttpResponse.json(story(1))),
      http.get(`${HN}/item/2.json`, () => HttpResponse.json(story(2))),
    );
    const { records } = await fetchTopStories(2, { sleep: noSleep });
    const repo = new InMemorySignalRepository();
    expect(await repo.upsertMany(records)).toBe(2);
    expect(await repo.upsertMany(records)).toBe(0); // second run: no new inserts
    expect(repo.records).toHaveLength(2);
  });
});
