import "@aioi/ui/tokens.css";
import type { ReactNode } from "react";
import { ClerkProvider, SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { clerkEnabled } from "./lib/dev-org";

export const metadata = {
  title: "AI Opportunity Intelligence",
  description: "Discover AI trends before everyone else. Validate opportunities. Build faster.",
};

function AuthControls() {
  return (
    <>
      <SignedOut>
        <SignInButton mode="modal" />
      </SignedOut>
      <SignedIn>
        <UserButton afterSignOutUrl="/trends" />
      </SignedIn>
    </>
  );
}

export default function RootLayout({ children }: { children: ReactNode }) {
  const body = (
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
          <nav
            style={{
              marginLeft: "auto",
              display: "flex",
              gap: "16px",
              fontSize: "0.875rem",
              alignItems: "center",
            }}
          >
            <a href="/trends" style={{ color: "var(--fg-muted)" }}>
              Trends
            </a>
            <a href="/watchlists" style={{ color: "var(--fg-muted)" }}>
              Watchlists
            </a>
            <a href="/notifications" style={{ color: "var(--fg-muted)" }}>
              Notifications
            </a>
            <a href="/briefs" style={{ color: "var(--fg-muted)" }}>
              Briefs
            </a>
            <a href="/billing" style={{ color: "var(--fg-muted)" }}>
              Billing
            </a>
            <a href="/sources" style={{ color: "var(--fg-muted)" }}>
              Sources
            </a>
            {clerkEnabled && <AuthControls />}
          </nav>
        </header>
        <div style={{ maxWidth: 1040, margin: "0 auto", padding: "24px" }}>{children}</div>
      </body>
    </html>
  );

  return clerkEnabled ? <ClerkProvider>{body}</ClerkProvider> : body;
}
