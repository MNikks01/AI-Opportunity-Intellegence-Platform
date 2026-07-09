import "@aioi/ui/tokens.css";
import "./globals.css";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import { ClerkProvider, SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { clerkEnabled } from "./lib/dev-org";
import { getSiteUrl } from "./lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "AI Opportunity Intelligence",
    template: "%s · AI Opportunity Intelligence",
  },
  description: "Discover AI trends before everyone else. Validate opportunities. Build faster.",
  openGraph: { siteName: "AI Opportunity Intelligence", type: "website" },
  twitter: { card: "summary" },
};

// Ensure correct scaling on phones/tablets (device-width, no forced zoom).
export const viewport = {
  width: "device-width",
  initialScale: 1,
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
        <header className="app-header">
          <span className="app-brand">◧ AI Opportunity Intelligence</span>
          <nav className="app-nav" aria-label="Primary">
            <a href="/trends">Trends</a>
            <a href="/quadrant">Quadrant</a>
            <a href="/entities">Entities</a>
            <a href="/watchlists">Watchlists</a>
            <a href="/notifications">Notifications</a>
            <a href="/briefs">Briefs</a>
            <a href="/team">Team</a>
            <a href="/billing">Billing</a>
            <a href="/sources">Sources</a>
            {clerkEnabled && <AuthControls />}
          </nav>
        </header>
        <div className="app-container">{children}</div>
      </body>
    </html>
  );

  return clerkEnabled ? <ClerkProvider>{body}</ClerkProvider> : body;
}
