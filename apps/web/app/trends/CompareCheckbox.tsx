"use client";

import { useCompare, COMPARE_MAX } from "./CompareContext";

/** A per-card "Compare" checkbox that adds/removes the trend from the browse compare selection. */
export function CompareCheckbox({ slug }: { slug: string }) {
  const { slugs, toggle } = useCompare();
  const checked = slugs.includes(slug);
  const disabled = !checked && slugs.length >= COMPARE_MAX;
  return (
    <label
      className={`compare-check${checked ? " is-on" : ""}`}
      title={disabled ? `Compare up to ${COMPARE_MAX} at a time` : "Add to compare"}
    >
      <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggle(slug)} />
      <span>Compare</span>
    </label>
  );
}
