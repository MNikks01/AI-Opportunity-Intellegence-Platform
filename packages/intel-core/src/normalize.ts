/**
 * Normalization layer (M2). Pure, deterministic transforms applied to a raw signal before enrichment:
 * text cleanup, canonical URL, a stable content hash (the analysis cache key), and coarse language
 * detection. No network, no DB.
 */
import { createHash } from "node:crypto";

/**
 * Collapse whitespace, strip zero-width + control chars, normalize non-breaking spaces, and trim.
 * Deterministic — the same input always yields the same output, which is what makes {@link contentHash}
 * a reliable cache key.
 */
export function cleanText(input: string): string {
  return input
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // zero-width chars
    .replace(/\u00A0/g, " ") // non-breaking space -> normal space
    .replace(/[\t\r\n\f\v]+/g, " ")
    .replace(/ {2,}/g, " ")
    .trim();
}

/** Tracking params stripped from URLs so the same article shared with different UTM tags dedupes. */
const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
  "mc_cid",
  "mc_eid",
  "ref",
  "ref_src",
]);

/**
 * Canonicalize a URL for dedupe: lowercase host, drop the fragment, strip tracking params, remove a
 * trailing slash, and sort the remaining query params. Returns the input trimmed if it does not parse.
 */
export function canonicalUrl(raw: string): string {
  const trimmed = raw.trim();
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return trimmed;
  }
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  // Drop a trailing slash on a real path segment (but keep the root "/").
  if (url.pathname !== "/" && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.replace(/\/+$/, "");
  }
  const kept: [string, string][] = [];
  for (const [k, v] of url.searchParams) {
    if (!TRACKING_PARAMS.has(k.toLowerCase())) kept.push([k, v]);
  }
  kept.sort(([a], [b]) => a.localeCompare(b));
  url.search = "";
  for (const [k, v] of kept) url.searchParams.append(k, v);
  return url.toString();
}

/**
 * Stable SHA-256 over the cleaned title + body. The analysis cache key (ADR-0009 cost guardrail): the
 * same content — even reposted from another source — hashes identically, so it is analyzed once.
 */
export function contentHash(title: string, body = ""): string {
  const normalized = `${cleanText(title)}\n${cleanText(body)}`.toLowerCase();
  return createHash("sha256").update(normalized).digest("hex");
}

/**
 * Coarse, offline language detection by dominant script. Enough to hint region and route to the right
 * analysis prompt; not a full language classifier. Returns an ISO-639-1-ish code, defaulting to "en".
 */
export function detectLanguage(text: string): string {
  const counts = {
    cjkHan: 0,
    kana: 0,
    hangul: 0,
    cyrillic: 0,
    devanagari: 0,
    arabic: 0,
  };
  for (const ch of text) {
    const c = ch.codePointAt(0)!;
    if ((c >= 0x3040 && c <= 0x309f) || (c >= 0x30a0 && c <= 0x30ff)) counts.kana++;
    else if (c >= 0xac00 && c <= 0xd7a3) counts.hangul++;
    else if (c >= 0x4e00 && c <= 0x9fff) counts.cjkHan++;
    else if (c >= 0x0400 && c <= 0x04ff) counts.cyrillic++;
    else if (c >= 0x0900 && c <= 0x097f) counts.devanagari++;
    else if (c >= 0x0600 && c <= 0x06ff) counts.arabic++;
  }
  // Japanese kana are unambiguous; check before Han (which Japanese also uses).
  if (counts.kana > 0) return "ja";
  if (counts.hangul > 0) return "ko";
  if (counts.cjkHan > 0) return "zh";
  if (counts.cyrillic > 0) return "ru";
  if (counts.devanagari > 0) return "hi";
  if (counts.arabic > 0) return "ar";
  return "en";
}
