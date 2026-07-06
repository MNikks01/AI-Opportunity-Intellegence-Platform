import { describe, expect, it } from "vitest";
import { runEvalHarness } from "./eval";

// The eval gate: golden invariants + determinism must hold, or CI fails (B-009).
describe("llm eval harness (golden gate)", () => {
  it("passes every golden invariant", async () => {
    const { results, passed } = await runEvalHarness();
    const failed = results.filter((r) => !r.passed).map((r) => r.name);
    expect(failed, `failing checks: ${failed.join(", ")}`).toEqual([]);
    expect(passed).toBe(true);
    expect(results.length).toBeGreaterThanOrEqual(9);
  });
});
