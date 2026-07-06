import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost";

const BASE = {
  padding: "8px 16px",
  borderRadius: "8px",
  fontWeight: 600,
  fontSize: "0.875rem",
  cursor: "pointer",
  lineHeight: 1.2,
} as const;

const VARIANTS: Record<ButtonVariant, CSSProperties> = {
  primary: { border: "1px solid var(--primary)", background: "var(--primary)", color: "#fff" },
  secondary: { border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)" },
  ghost: { border: "1px solid var(--border)", background: "transparent", color: "var(--fg-muted)" },
};

export function Button({
  variant = "primary",
  children,
  style,
  ...props
}: { variant?: ButtonVariant; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} style={{ ...BASE, ...VARIANTS[variant], ...style }}>
      {children}
    </button>
  );
}

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  align?: "left" | "right";
}

/** Minimal, accessible, responsive (horizontally scrollable) data table. */
export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  empty = "No data.",
}: {
  columns: Array<Column<T>>;
  rows: readonly T[];
  getRowKey: (row: T) => string;
  empty?: ReactNode;
}) {
  if (rows.length === 0) {
    return (
      <div className="aioi-card" style={{ color: "var(--fg-muted)" }}>
        {empty}
      </div>
    );
  }
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                style={{
                  textAlign: c.align ?? "left",
                  padding: "8px 12px",
                  color: "var(--fg-muted)",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getRowKey(row)} style={{ borderBottom: "1px solid var(--border)" }}>
              {columns.map((c) => (
                <td key={c.key} style={{ textAlign: c.align ?? "left", padding: "8px 12px" }}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
