"use client";

import { useCompare } from "./CompareContext";

/** Floating bar showing the current compare selection with a link to the comparison page. */
export function CompareBar() {
  const { slugs, clear } = useCompare();
  if (slugs.length === 0) return null;
  return (
    <div className="compare-bar" role="region" aria-label="Compare selection">
      <span className="compare-bar-count">{slugs.length} selected</span>
      {slugs.length >= 2 ? (
        <a href={`/trends/compare?slugs=${slugs.join(",")}`} className="compare-bar-go">
          Compare →
        </a>
      ) : (
        <span className="compare-bar-hint">pick 1 more</span>
      )}
      <button type="button" onClick={clear} className="compare-bar-clear">
        Clear
      </button>
    </div>
  );
}
