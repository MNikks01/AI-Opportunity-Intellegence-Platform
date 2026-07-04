import "@aioi/ui/tokens.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "AI Opportunity Intelligence",
  description: "Discover AI trends before everyone else. Validate opportunities. Build faster.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header
          style={{
            borderBottom: "1px solid var(--border)",
            padding: "12px 24px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <span style={{ fontWeight: 600 }}>◧ AI Opportunity Intelligence</span>
          <nav style={{ marginLeft: "auto", display: "flex", gap: "16px", fontSize: "0.875rem" }}>
            <a href="/trends" style={{ color: "var(--fg-muted)" }}>
              Trends
            </a>
            <a href="/watchlists" style={{ color: "var(--fg-muted)" }}>
              Watchlists
            </a>
          </nav>
        </header>
        <div style={{ maxWidth: 1040, margin: "0 auto", padding: "24px" }}>{children}</div>
      </body>
    </html>
  );
}
