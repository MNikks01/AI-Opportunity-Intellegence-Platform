/** Inline "you hit a plan limit" banner shown when a create action is blocked by entitlements. */
export function UpgradeNotice({ feature }: { feature: "watchlists" | "alerts" }) {
  return (
    <p
      role="status"
      style={{
        margin: "0 0 20px",
        padding: "10px 14px",
        borderRadius: "8px",
        border: "1px solid var(--border)",
        background: "var(--bg-muted)",
        color: "var(--fg-muted)",
        fontSize: "0.875rem",
      }}
    >
      You&rsquo;ve reached your plan&rsquo;s {feature} limit.{" "}
      <a href="/pricing" style={{ color: "var(--primary)" }}>
        Upgrade to Pro
      </a>{" "}
      for unlimited {feature}.
    </p>
  );
}
