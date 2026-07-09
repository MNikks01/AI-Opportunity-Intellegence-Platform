/**
 * A single usage-vs-limit row with a progress bar. `limit < 0` means unlimited (no cap to meter,
 * just the running count). The fill turns amber at ≥80% and red once the limit is reached.
 */
export function UsageMeter({
  label,
  used,
  limit,
  unit,
}: {
  label: string;
  used: number;
  limit: number;
  unit?: string;
}) {
  const unlimited = limit < 0;
  const pct = unlimited || limit === 0 ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const state = unlimited
    ? "unlimited"
    : used >= limit
      ? "full"
      : used / limit >= 0.8
        ? "warn"
        : "ok";

  return (
    <div className="usage-row">
      <div className="usage-head">
        <span className="usage-label">{label}</span>
        <span className="usage-count">
          {used.toLocaleString()}
          {unlimited ? " used · Unlimited" : ` / ${limit.toLocaleString()}`}
          {unit ? ` ${unit}` : ""}
        </span>
      </div>
      <div className="usage-track">
        <div
          className={`usage-fill is-${state}`}
          style={{ width: unlimited ? "100%" : `${pct}%` }}
        />
      </div>
    </div>
  );
}
