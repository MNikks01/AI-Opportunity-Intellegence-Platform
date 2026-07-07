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

// Sort options — "Newest" plus the non-inverted score dimensions (highest first makes sense for these).
const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "recent", label: "Newest" },
  { value: "opportunity", label: "Highest opportunity" },
  { value: "business", label: "Highest business" },
  { value: "developer", label: "Highest developer" },
  { value: "creator", label: "Highest creator" },
  { value: "monetization", label: "Highest monetization" },
  { value: "seo", label: "Highest SEO" },
  { value: "predicted_lifetime", label: "Longest predicted lifetime" },
];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "EARLY", label: "Early" },
  { value: "ACTIVE", label: "Active" },
  { value: "FADING", label: "Fading" },
  { value: "ARCHIVED", label: "Archived" },
];

/**
 * Browse controls for the trends page: radio buttons to filter by source, plus status + sort selects.
 * Updates the URL query (server component re-fetches), preserving any search term and resetting to page 1.
 */
export function TrendControls({
  sources,
  source,
  status,
  sort,
}: {
  sources: string[];
  source: string;
  status: string;
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
        <span>Status</span>
        <select value={status} onChange={(e) => update({ status: e.target.value })}>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value || "all"} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <label className="trend-sort">
        <span>Sort</span>
        <select value={sort} onChange={(e) => update({ sort: e.target.value })}>
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
