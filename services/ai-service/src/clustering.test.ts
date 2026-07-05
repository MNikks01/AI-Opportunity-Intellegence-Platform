import { describe, expect, it } from "vitest";
import { clusterSignals } from "./clustering";

// Pure — uses the deterministic StubEmbedder (identical text → identical vector → same cluster;
// distinct text → ~orthogonal → separate clusters).
describe("clusterSignals", () => {
  it("groups identical text and separates distinct text", async () => {
    const clusters = await clusterSignals([
      { id: "1", text: "vector databases at scale" },
      { id: "2", text: "vector databases at scale" },
      { id: "3", text: "on-device quantized inference" },
    ]);
    expect(clusters).toHaveLength(2);
    const big = clusters.find((c) => c.signalIds.length === 2);
    expect(big?.signalIds.sort()).toEqual(["1", "2"]);
    expect(clusters.some((c) => c.signalIds.length === 1 && c.signalIds[0] === "3")).toBe(true);
  });

  it("labels a cluster from its first signal and handles the empty case", async () => {
    expect(await clusterSignals([])).toEqual([]);
    const [c] = await clusterSignals([{ id: "x", text: "Agentic RAG frameworks" }]);
    expect(c!.label).toBe("Agentic RAG frameworks");
  });
});
