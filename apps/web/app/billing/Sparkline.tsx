/**
 * A compact SVG sparkline of daily counts (oldest → newest) with a soft area fill and an emphasized
 * final point. Pure/deterministic: it only draws the `values` it's given. Flat-zero series render as a
 * baseline. `title` is used for the accessible label.
 */
export function Sparkline({
  values,
  title,
  width = 260,
  height = 44,
}: {
  values: number[];
  title: string;
  width?: number;
  height?: number;
}) {
  const pad = 3;
  const n = values.length;
  const max = Math.max(1, ...values);
  const dx = n > 1 ? (width - pad * 2) / (n - 1) : 0;
  const y = (v: number) => height - pad - (v / max) * (height - pad * 2);
  const x = (i: number) => pad + i * dx;

  const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  const line = `M ${pts.join(" L ")}`;
  const area = `M ${x(0).toFixed(1)},${height - pad} L ${pts.join(" L ")} L ${x(n - 1).toFixed(1)},${height - pad} Z`;
  const last = values[n - 1] ?? 0;

  return (
    <svg
      className="spark"
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={title}
      preserveAspectRatio="none"
    >
      <path className="spark-area" d={area} />
      <path className="spark-line" d={line} fill="none" />
      <circle className="spark-dot" cx={x(n - 1)} cy={y(last)} r={2.6} />
    </svg>
  );
}
