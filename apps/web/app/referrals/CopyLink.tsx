"use client";

import { useState } from "react";

/** Read-only referral link with a copy button. Falls back silently if clipboard is unavailable. */
export function CopyLink({ link }: { link: string; code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard blocked — the input is selectable as a fallback
    }
  }

  return (
    <div className="referrals-link">
      <input readOnly value={link} aria-label="Your referral link" className="team-input" />
      <button type="button" onClick={copy} className="watch-btn">
        {copied ? "Copied ✓" : "Copy"}
      </button>
    </div>
  );
}
