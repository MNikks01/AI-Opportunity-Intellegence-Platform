"use client";

import { useRouter, useSearchParams } from "next/navigation";

const SOURCE_LABELS: Record<string, string> = {
  hackernews: "HackerNews",
  youtube: "YouTube",
  github: "GitHub",
  huggingface: "Hugging Face",
  reddit: "Reddit",
  producthunt: "Product Hunt",
};
const label = (k: string) => SOURCE_LABELS[k] ?? k;

/**
 * Browse controls for the trends page: radio buttons to filter by source and a sort select. Updates the
 * URL query (server component re-fetches), preserving any search term and resetting to page 1.
 */
export function TrendControls({
  sources,
  source,
  sort,
}: {
  sources: string[];
  source: string;
  sort: string;
}) {
  const router = useRouter();
  const params = useSearchParams();

  function update(next: Record<string, string>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    sp.delete("page"); // any filter/sort change returns to the first page
    router.push(`/trends?${sp.toString()}`);
  }

  return (
    <div className="trend-controls">
      <fieldset className="trend-sources">
        <legend>Source</legend>
        <div className="trend-radios">
          {["", ...sources].map((key) => (
            <label
              key={key || "all"}
              className={`trend-radio${source === key ? " is-active" : ""}`}
            >
              <input
                type="radio"
                name="source"
                value={key}
                checked={source === key}
                onChange={() => update({ source: key })}
              />
              <span>{key ? label(key) : "All"}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="trend-sort">
        <span>Sort</span>
        <select value={sort} onChange={(e) => update({ sort: e.target.value })}>
          <option value="recent">Newest</option>
          <option value="score">Highest opportunity</option>
        </select>
      </label>
    </div>
  );
}
