/**
 * Pure logic for the content script (ADR-0007 v2, B-041a): turn a GitHub repo / Hugging Face model page
 * URL into the entity name we track, and build the lookup URL. No DOM/fetch here so it's unit-tested.
 */
import { DEFAULT_BASE, normalizeBase } from "./api";

// GitHub paths that are not a repo (owner/<reserved>) — don't treat as an entity.
const GH_RESERVED = new Set([
  "settings",
  "marketplace",
  "explore",
  "topics",
  "trending",
  "notifications",
  "sponsors",
  "features",
  "about",
  "pricing",
  "orgs",
  "apps",
  "login",
  "join",
]);
// Hugging Face top-level sections that aren't a model id.
const HF_SECTIONS = new Set([
  "models",
  "datasets",
  "spaces",
  "organizations",
  "settings",
  "docs",
  "blog",
  "pricing",
  "login",
  "join",
]);

/** Extract the tracked entity name from a GitHub/HF URL, or null if the page isn't one. */
export function entityNameFromUrl(href: string): string | null {
  let u: URL;
  try {
    u = new URL(href);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "");
  const parts = u.pathname.split("/").filter(Boolean);

  if (host === "github.com") {
    if (parts.length < 2) return null;
    const [owner, repo] = parts;
    if (!owner || !repo || GH_RESERVED.has(owner.toLowerCase())) return null;
    return `${owner}/${repo}`;
  }
  if (host === "huggingface.co" || host === "hf.co") {
    if (parts.length === 0) return null;
    if (HF_SECTIONS.has(parts[0]!.toLowerCase())) {
      // e.g. /models/org/model → org/model
      const rest = parts.slice(1);
      return rest.length >= 2 ? `${rest[0]}/${rest[1]}` : null;
    }
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : parts[0]!;
  }
  return null;
}

export function lookupUrl(base: string, name: string): string {
  return `${normalizeBase(base)}/api/v1/entities/lookup?name=${encodeURIComponent(name)}`;
}

export { DEFAULT_BASE };
