/**
 * Source: Product Hunt
 * Classification: ✅ OFFICIAL — Product Hunt API v2 (GraphQL), authenticated with a developer token.
 * ToS: Product Hunt API Terms (reviewed 2026-07-06). Reads public launch metadata only. PII: makers
 * are public handles, kept only inside `raw`. Unconfigured → no-ops, so CI stays green without a token.
 * Auth: PRODUCTHUNT_TOKEN (api.producthunt.com/v2/oauth/applications → Developer Token).
 */
import { z } from "zod";
import type { SourceRecord } from "@aioi/shared";

export const PRODUCTHUNT_SOURCE_KEY = "producthunt";
const GRAPHQL_URL = "https://api.producthunt.com/v2/api/graphql";

const QUERY = `query TopPosts($first: Int!) {
  posts(first: $first, order: RANKING) {
    edges { node { id name tagline description url votesCount createdAt } }
  }
}`;

function userAgent(env: NodeJS.ProcessEnv): string {
  return env.PRODUCTHUNT_USER_AGENT ?? "aioi-ingestion/1.0";
}

export function productHuntConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.PRODUCTHUNT_TOKEN);
}

const nodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  tagline: z.string().optional(),
  description: z.string().nullable().optional(),
  url: z.string().optional(),
  votesCount: z.number().optional(),
  createdAt: z.string().optional(),
});
export type ProductHuntPost = z.infer<typeof nodeSchema>;

const responseSchema = z.object({
  data: z.object({
    posts: z.object({ edges: z.array(z.object({ node: z.unknown() })) }),
  }),
});

export interface FetchDeps {
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  maxRetries?: number;
  env?: NodeJS.ProcessEnv;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

type Resolved = Required<Omit<FetchDeps, "env">> & { env: NodeJS.ProcessEnv };
function resolve(deps: FetchDeps): Resolved {
  return {
    fetchImpl: deps.fetchImpl ?? fetch,
    sleep: deps.sleep ?? defaultSleep,
    maxRetries: deps.maxRetries ?? 3,
    env: deps.env ?? process.env,
  };
}

/** Normalize a validated post to a SourceRecord. */
export function normalize(post: ProductHuntPost): SourceRecord | null {
  if (!post.name) return null;
  const text = [post.name, post.tagline ?? "", post.description ?? ""]
    .filter(Boolean)
    .join(" ")
    .trim();
  return {
    source: PRODUCTHUNT_SOURCE_KEY,
    externalId: post.id,
    url: post.url ?? `https://www.producthunt.com/posts/${post.id}`,
    title: post.name,
    publishedAt: post.createdAt,
    text,
    raw: post,
  };
}

export interface IngestResult {
  records: SourceRecord[];
  skipped: number;
}

/** Fetch the top-ranked posts as SourceRecords (needs PRODUCTHUNT_TOKEN). */
export async function fetchTopPosts(limit = 20, deps: FetchDeps = {}): Promise<IngestResult> {
  const r = resolve(deps);
  const token = r.env.PRODUCTHUNT_TOKEN;
  if (!token) throw new Error("producthunt token not configured");

  let attempt = 0;
  let res: Response;
  for (;;) {
    res = await r.fetchImpl(GRAPHQL_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        accept: "application/json",
        "user-agent": userAgent(r.env),
      },
      body: JSON.stringify({ query: QUERY, variables: { first: limit } }),
    });
    if (res.status === 429 || res.status >= 500) {
      if (attempt >= r.maxRetries)
        throw new Error(`producthunt fetch failed ${res.status} after ${attempt} retries`);
      const retryAfter = Number(res.headers.get("retry-after"));
      const backoff =
        Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 500;
      await r.sleep(backoff + Math.floor(Math.random() * 100));
      attempt += 1;
      continue;
    }
    break;
  }
  if (!res.ok) throw new Error(`producthunt fetch failed ${res.status}`);
  const parsed = responseSchema.safeParse(await res.json());
  if (!parsed.success) return { records: [], skipped: 0 };

  const records: SourceRecord[] = [];
  let skipped = 0;
  for (const edge of parsed.data.data.posts.edges) {
    const node = nodeSchema.safeParse(edge.node);
    if (!node.success) {
      skipped += 1;
      continue;
    }
    const record = normalize(node.data);
    if (record) records.push(record);
    else skipped += 1;
  }
  return { records, skipped };
}
