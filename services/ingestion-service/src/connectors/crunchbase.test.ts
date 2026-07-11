import { describe, expect, it, vi } from "vitest";
import {
  normalize,
  formatUsd,
  fetchFundingRounds,
  crunchbaseConfigured,
  CRUNCHBASE_SOURCE_KEY,
} from "./crunchbase";

const round = (uuid: string, org: string, usd: number | null, permalink = org.toLowerCase()) => ({
  uuid,
  properties: {
    announced_on: { value: "2026-06-01" },
    investment_type: "series_a",
    money_raised: { value_usd: usd },
    funded_organization_identifier: { value: org, permalink },
  },
});

const SEARCH = {
  entities: [round("r1", "Acme AI", 1_000_000_000), round("r2", "Beta ML", 5_000_000)],
};

function jsonResponse(body: unknown, status = 200, retryAfter?: string): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    headers: {
      get: (k: string) => (k.toLowerCase() === "retry-after" ? (retryAfter ?? null) : null),
    },
  } as unknown as Response;
}

const OPTS = { apiKey: "cb_test", sleep: () => Promise.resolve() };

describe("crunchbase connector", () => {
  it("crunchbaseConfigured reflects the key", () => {
    expect(crunchbaseConfigured({} as NodeJS.ProcessEnv)).toBe(false);
    expect(crunchbaseConfigured({ CRUNCHBASE_API_KEY: "x" } as unknown as NodeJS.ProcessEnv)).toBe(
      true,
    );
  });

  it("formatUsd renders compact amounts and handles undisclosed", () => {
    expect(formatUsd(1_200_000_000)).toBe("$1.2B");
    expect(formatUsd(500_000_000)).toBe("$500.0M");
    expect(formatUsd(900_000)).toBe("$900K");
    expect(formatUsd(null)).toBe("an undisclosed amount");
  });

  it("normalize maps a funding round to a SourceRecord; drops malformed", () => {
    const rec = normalize(SEARCH.entities[0])!;
    expect(rec.source).toBe(CRUNCHBASE_SOURCE_KEY);
    expect(rec.externalId).toBe("r1");
    expect(rec.title).toBe("Acme AI — raised $1.0B (Crunchbase)");
    expect(rec.url).toContain("crunchbase.com/organization/acme ai");
    expect(normalize({ uuid: "x", properties: {} })).toBeNull(); // no org
    expect(normalize({ garbage: true })).toBeNull();
  });

  it("fetchFundingRounds posts the search with the key and returns records (happy path)", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(SEARCH));
    const { records, skipped } = await fetchFundingRounds({ fetchImpl, ...OPTS });
    expect(records).toHaveLength(2);
    expect(skipped).toBe(0);
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toContain("api.crunchbase.com");
    expect((init as RequestInit).method).toBe("POST");
    expect((init as { headers: Record<string, string> }).headers["x-cb-user-key"]).toBe("cb_test");
  });

  it("retries on 429 then succeeds; skips malformed/empty", async () => {
    let n = 0;
    const retry = vi.fn().mockImplementation(() => {
      n += 1;
      return Promise.resolve(n === 1 ? jsonResponse(null, 429, "0") : jsonResponse(SEARCH));
    });
    expect((await fetchFundingRounds({ fetchImpl: retry, ...OPTS })).records).toHaveLength(2);
    expect(n).toBe(2);

    const bad = vi.fn().mockResolvedValue(jsonResponse({ nope: true }));
    expect((await fetchFundingRounds({ fetchImpl: bad, ...OPTS })).skipped).toBe(1);
    const empty = vi.fn().mockResolvedValue(jsonResponse({ entities: [] }));
    expect((await fetchFundingRounds({ fetchImpl: empty, ...OPTS })).records).toHaveLength(0);
  });
});
