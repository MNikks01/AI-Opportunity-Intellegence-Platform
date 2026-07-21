/**
 * Dedupe layer (M2). Pure similarity helpers for catching cross-source near-duplicates (the same story
 * reposted or lightly reworded). Two strategies:
 *   - lexical: word-shingle Jaccard — no model needed, runs at ingest time;
 *   - vector: cosine over caller-supplied embeddings — used in M4 once embeddings exist.
 * No network, no DB.
 */

/** Lowercase, strip punctuation, split into word tokens. */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Build the set of word n-gram shingles for a text. `size` = words per shingle (default 3). Short texts
 * fall back to their individual tokens so they still compare meaningfully.
 */
export function shingles(text: string, size = 3): Set<string> {
  const tokens = tokenize(text);
  if (tokens.length < size) return new Set(tokens);
  const out = new Set<string>();
  for (let i = 0; i <= tokens.length - size; i++) {
    out.add(tokens.slice(i, i + size).join(" "));
  }
  return out;
}

/** Jaccard similarity of two sets: intersection over union. Returns 0 when both are empty. */
export function jaccard<T>(a: Set<T>, b: Set<T>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const x of a) if (b.has(x)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Lexical near-duplicate check between two texts via shingle Jaccard. Default threshold 0.8 catches
 * reposts and light rewrites while leaving genuinely distinct articles apart.
 */
export function isNearDuplicate(a: string, b: string, threshold = 0.8): boolean {
  return jaccard(shingles(a), shingles(b)) >= threshold;
}

/**
 * Cosine similarity of two equal-length vectors. Throws on a length mismatch (a programming error, not a
 * data condition). Returns 0 if either vector is all-zero. For M4 embedding-based dedupe/search.
 */
export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length) {
    throw new Error(`cosineSimilarity: length mismatch (${a.length} vs ${b.length})`);
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    const av = a[i]!;
    const bv = b[i]!;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
