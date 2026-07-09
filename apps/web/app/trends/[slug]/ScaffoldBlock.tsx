"use client";

import { useState } from "react";

/** The scaffold prompt with copy + download — the last mile from opportunity to a coding agent. */
export function ScaffoldBlock({ prompt, filename }: { prompt: string; filename: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard unavailable (e.g. insecure context) — the text is selectable in the block below
    }
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([prompt], { type: "text/markdown" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="scaffold">
      <div className="scaffold-head">
        <span className="scaffold-hint">
          Paste into <strong>Claude Code</strong>, <strong>Cursor</strong>, or <strong>v0</strong>{" "}
          to scaffold the project.
        </span>
        <span className="scaffold-actions">
          <button type="button" onClick={copy} className="scaffold-btn scaffold-btn-primary">
            {copied ? "Copied ✓" : "Copy prompt"}
          </button>
          <button type="button" onClick={download} className="scaffold-btn">
            Download .md
          </button>
        </span>
      </div>
      <pre className="scaffold-pre">{prompt}</pre>
    </div>
  );
}
