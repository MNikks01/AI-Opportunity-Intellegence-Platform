import type { Metadata } from "next";
import { unsubscribe } from "@aioi/database";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false } };

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const email = token ? await unsubscribe(token) : null;

  return (
    <main style={{ maxWidth: 480, margin: "72px auto", textAlign: "center" }}>
      <h1 style={{ fontSize: "1.5rem", margin: "0 0 12px" }}>Newsletter</h1>
      {email ? (
        <p style={{ color: "var(--fg-muted)" }}>
          <strong>{email}</strong> has been unsubscribed. Sorry to see you go — you can resubscribe
          anytime from the homepage.
        </p>
      ) : (
        <p style={{ color: "var(--fg-muted)" }}>This unsubscribe link is invalid or has expired.</p>
      )}
      <p style={{ marginTop: 20 }}>
        <a href="/" style={{ color: "var(--primary)" }}>
          ← Back to the site
        </a>
      </p>
    </main>
  );
}
