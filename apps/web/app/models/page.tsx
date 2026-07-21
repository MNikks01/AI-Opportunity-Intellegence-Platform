import type { Metadata } from "next";
import { listModelCards } from "@aioi/database";
import { getSiteUrl } from "../lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Open-Source Model Tracker",
  description:
    "Tracked open-source AI models — license, parameters, and GGUF/Ollama/vLLM/MLX availability at a glance.",
  alternates: { canonical: `${getSiteUrl()}/models` },
};

function yn(v: boolean): string {
  return v ? "✓" : "—";
}

export default async function ModelsPage() {
  const models = await listModelCards({}, 100);

  return (
    <main>
      <h1 style={{ fontSize: "1.5rem", margin: "0 0 4px" }}>Open-Source Model Tracker</h1>
      <p style={{ color: "var(--fg-muted)", margin: "0 0 16px" }}>
        Tracked models with their license, size, and runtime availability. Detail (benchmarks,
        weights) fills in as the model-card enrichment runs.
      </p>

      {models.length === 0 ? (
        <div className="aioi-card" style={{ color: "var(--fg-muted)" }}>
          No models tracked yet — models are discovered as entities from the ingestion + analysis
          pipeline, then enriched with card detail.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="models-table">
            <thead>
              <tr>
                <th scope="col">Model</th>
                <th scope="col">License</th>
                <th scope="col">Params (B)</th>
                <th scope="col">GGUF</th>
                <th scope="col">Ollama</th>
                <th scope="col">vLLM</th>
                <th scope="col">MLX</th>
                <th scope="col">Trends</th>
              </tr>
            </thead>
            <tbody>
              {models.map((m) => (
                <tr key={m.entityId}>
                  <td>{m.name}</td>
                  <td>{m.license ?? "—"}</td>
                  <td>{m.paramsB ?? "—"}</td>
                  <td>{yn(m.ggufAvailable)}</td>
                  <td>{m.ollamaTag ?? yn(false)}</td>
                  <td>{yn(m.vllmSupported)}</td>
                  <td>{yn(m.mlxAvailable)}</td>
                  <td>{m.linkedTrendCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
