/**
 * Content script (ADR-0007 v2, B-041a). On a GitHub repo / Hugging Face model page, look the entity up
 * in AIOI and, if we track it, inject a small non-intrusive badge linking to its tracking page. Uses the
 * production API base (the CORS-open public API); a per-user base is a v2 refinement.
 */
import { DEFAULT_BASE, entityNameFromUrl, lookupUrl } from "./content-api";

interface Lookup {
  data?: {
    name: string;
    type: string;
    linkedTrendCount: number;
    momentum: { state: string; delta: number } | null;
  };
}

const BADGE_ID = "aioi-entity-badge";

function inject(text: string, href: string): void {
  if (document.getElementById(BADGE_ID)) return;
  const a = document.createElement("a");
  a.id = BADGE_ID;
  a.href = href;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.textContent = text;
  Object.assign(a.style, {
    position: "fixed",
    right: "16px",
    bottom: "16px",
    zIndex: "2147483647",
    padding: "8px 12px",
    background: "#5b5bd6",
    color: "#fff",
    font: "600 12px -apple-system, Segoe UI, Roboto, sans-serif",
    borderRadius: "10px",
    textDecoration: "none",
    boxShadow: "0 4px 14px rgba(0,0,0,.25)",
  } satisfies Partial<CSSStyleDeclaration>);
  document.body.appendChild(a);
}

async function run(): Promise<void> {
  const name = entityNameFromUrl(location.href);
  if (!name) return;
  try {
    const res = await fetch(lookupUrl(DEFAULT_BASE, name), {
      headers: { accept: "application/json" },
    });
    if (!res.ok) return; // 404 = not tracked; stay silent
    const body = (await res.json()) as Lookup;
    const e = body.data;
    if (!e) return;
    const mo =
      e.momentum && e.momentum.state !== "new"
        ? e.momentum.state === "accelerating"
          ? ` · ▲ +${e.momentum.delta}`
          : ` · ${e.momentum.state}`
        : "";
    inject(
      `◧ AIOI: tracked · ${e.linkedTrendCount} trend${e.linkedTrendCount === 1 ? "" : "s"}${mo}`,
      `${DEFAULT_BASE}/entities`,
    );
  } catch {
    // network/CORS failure — stay silent, never disrupt the page.
  }
}

void run();
