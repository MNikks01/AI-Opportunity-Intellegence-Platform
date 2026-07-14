import { describe, expect, it, vi } from "vitest";
import { normalize, fetchJobs, looksAiJob, type RemoteOkJob } from "./remoteok";

const LEGAL = { legal: "link back to Remote OK", last_updated: 1783966912 };
const AI_JOB: RemoteOkJob = {
  id: "1001",
  position: "Machine Learning Engineer",
  company: "Acme AI",
  tags: ["machine learning", "pytorch", "llm"],
  description: "<p>Build <b>LLM</b> pipelines.</p>",
  url: "https://remoteOK.com/remote-jobs/ml-engineer-1001",
  date: "2026-07-08T04:45:53+00:00",
};
const NON_AI_JOB: RemoteOkJob = {
  id: "1002",
  position: "Data Entry Specialist",
  company: "ReLytics",
  tags: ["web3", "crypto", "customer support"],
  description: "<p>Enter data into spreadsheets.</p>",
  url: "https://remoteOK.com/remote-jobs/data-entry-1002",
  date: "2026-07-08T04:45:53+00:00",
};

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status < 400,
    status,
    headers: { get: () => null },
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe("remoteok connector", () => {
  it("looksAiJob matches AI roles, not arbitrary jobs", () => {
    expect(looksAiJob("Machine Learning Engineer at Acme")).toBe(true);
    expect(looksAiJob("Data Entry Specialist web3 crypto")).toBe(false);
  });

  it("normalize keeps AI jobs and drops non-AI, keying to remoteok", () => {
    const rec = normalize(AI_JOB)!;
    expect(rec.source).toBe("remoteok");
    expect(rec.externalId).toBe("1001");
    expect(rec.title).toContain("Machine Learning Engineer");
    expect(rec.url).toContain("remoteOK.com");
    expect(normalize(NON_AI_JOB)).toBeNull();
  });

  it("normalize coerces a numeric id to a string", () => {
    const rec = normalize({ ...AI_JOB, id: 1234 as unknown as string })!;
    expect(rec.externalId).toBe("1234");
  });

  it("fetchJobs skips the leading legal element and filters to AI jobs", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse([LEGAL, AI_JOB, NON_AI_JOB]));
    const { records, skipped } = await fetchJobs({ fetchImpl, sleep: () => Promise.resolve() });
    expect(records).toHaveLength(1);
    expect(records[0]!.externalId).toBe("1001");
    expect(skipped).toBe(1); // the non-AI job
    // a descriptive user-agent is required by Remote OK
    const init = fetchImpl.mock.calls[0]![1] as RequestInit;
    expect((init.headers as Record<string, string>)["user-agent"]).toContain("AIOIBot");
  });

  it("fetchJobs tolerates an empty array", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse([LEGAL]));
    const { records } = await fetchJobs({ fetchImpl, sleep: () => Promise.resolve() });
    expect(records).toHaveLength(0);
  });
});
