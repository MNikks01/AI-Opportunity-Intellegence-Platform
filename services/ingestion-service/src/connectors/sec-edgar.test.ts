import { describe, expect, it, vi } from "vitest";
import { normalize, cleanIssuer, fetchFormDFilings, SEC_EDGAR_SOURCE_KEY } from "./sec-edgar";

const hit = (id: string, name: string, cik: string, form = "D") => ({
  _id: id,
  _source: { form, file_date: "2026-07-01", display_names: [name], ciks: [cik] },
});

const FTS = {
  hits: {
    hits: [
      hit("0001234567-25-000123:primary_doc.xml", "Acme AI Inc. (CIK 0001234567)", "0001234567"),
      hit(
        "0002345678-25-000456:primary_doc.xml",
        "Beta Robotics LLC (CIK 0002345678)",
        "0002345678",
      ),
    ],
  },
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

const ONE_QUERY = { queries: ['"artificial intelligence"'], sleep: () => Promise.resolve() };

describe("sec-edgar connector", () => {
  it("cleanIssuer strips the trailing CIK", () => {
    expect(cleanIssuer("Acme AI Inc. (CIK 0001234567)")).toBe("Acme AI Inc.");
    expect(cleanIssuer("Beta Corp")).toBe("Beta Corp");
  });

  it("normalize maps a Form D hit to a SourceRecord; drops non-D and issuer-less hits", () => {
    const rec = normalize(FTS.hits.hits[0])!;
    expect(rec.source).toBe(SEC_EDGAR_SOURCE_KEY);
    expect(rec.externalId).toBe("0001234567-25-000123:primary_doc.xml");
    expect(rec.title).toBe("Acme AI Inc. — private funding (Form D)");
    expect(rec.url).toContain("sec.gov/Archives/edgar/data/1234567/");
    expect(rec.raw).toBeTruthy();

    expect(normalize(hit("x", "Y Corp", "1", "S-1"))).toBeNull(); // wrong form
    expect(normalize({ _id: "z", _source: { form: "D" } })).toBeNull(); // no issuer
    expect(normalize({ garbage: true })).toBeNull(); // malformed
  });

  it("fetchFormDFilings reads AI-relevant Form D filings (happy path)", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(FTS));
    const { records, skipped } = await fetchFormDFilings({ fetchImpl, ...ONE_QUERY });
    expect(records).toHaveLength(2);
    expect(skipped).toBe(0);
    const url = fetchImpl.mock.calls[0]![0] as string;
    expect(url).toContain("efts.sec.gov");
    expect(url).toContain("forms=D");
  });

  it("retries on 429 then succeeds, honoring retry-after", async () => {
    let calls = 0;
    const fetchImpl = vi.fn().mockImplementation(() => {
      calls += 1;
      return Promise.resolve(calls === 1 ? jsonResponse(null, 429, "0") : jsonResponse(FTS));
    });
    const { records } = await fetchFormDFilings({ fetchImpl, ...ONE_QUERY });
    expect(calls).toBe(2);
    expect(records).toHaveLength(2);
  });

  it("skips a malformed payload and an empty result without crashing", async () => {
    const bad = vi.fn().mockResolvedValue(jsonResponse({ not: "edgar" }));
    expect((await fetchFormDFilings({ fetchImpl: bad, ...ONE_QUERY })).skipped).toBe(1);

    const empty = vi.fn().mockResolvedValue(jsonResponse({ hits: { hits: [] } }));
    expect((await fetchFormDFilings({ fetchImpl: empty, ...ONE_QUERY })).records).toHaveLength(0);
  });

  it("de-dupes the same filing across multiple AI queries (idempotent within a run)", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(FTS));
    const { records } = await fetchFormDFilings({
      fetchImpl,
      queries: ['"artificial intelligence"', '"machine learning"'],
      sleep: () => Promise.resolve(),
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2); // one request per query
    expect(records).toHaveLength(2); // but the same 2 filings, de-duped
  });
});
