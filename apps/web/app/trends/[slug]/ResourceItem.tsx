import { Badge } from "@aioi/ui";

export interface Resource {
  id: string;
  source: string;
  title: string | null;
  url: string | null;
  publishedAt: Date | null;
  raw?: unknown;
}

const SOURCE_LABELS: Record<string, string> = {
  hackernews: "HackerNews",
  youtube: "YouTube",
  github: "GitHub",
  huggingface: "Hugging Face",
  reddit: "Reddit",
  producthunt: "Product Hunt",
};
const sourceLabel = (k: string) => SOURCE_LABELS[k] ?? k;

function fmtDate(d: Date | null): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ── source-agnostic rich view ────────────────────────────────────────────────
interface Person {
  name: string;
  url?: string;
  sub?: string;
}
interface RichView {
  badge: string;
  name: string | null;
  url: string | null;
  meta: string[]; // e.g. ["⭐ 1,200", "TypeScript"]
  tagline?: string;
  description?: string | null;
  who?: { label: string; people: Person[] };
  links: { label: string; url: string }[];
  topics: string[];
}

const asObj = (x: unknown): Record<string, unknown> =>
  x && typeof x === "object" ? (x as Record<string, unknown>) : {};
const str = (x: unknown): string | undefined => (typeof x === "string" ? x : undefined);
const num = (x: unknown): number | undefined => (typeof x === "number" ? x : undefined);
const strArr = (x: unknown): string[] =>
  Array.isArray(x) ? x.filter((t): t is string => typeof t === "string") : [];

function githubView(r: Resource): RichView {
  const g = asObj(r.raw);
  const owner = asObj(g.owner);
  const stars = num(g.stargazers_count);
  const forks = num(g.forks_count);
  const login = str(owner.login);
  return {
    badge: "GitHub",
    name: str(g.full_name) ?? r.title,
    url: str(g.html_url) ?? r.url,
    meta: [
      stars !== undefined ? `⭐ ${stars.toLocaleString()}` : "",
      forks !== undefined ? `⑂ ${forks.toLocaleString()}` : "",
      str(g.language) ?? "",
    ].filter(Boolean),
    description: str(g.description) ?? null,
    who: login
      ? {
          label: "Owner",
          people: [{ name: login, url: str(owner.html_url) ?? `https://github.com/${login}` }],
        }
      : undefined,
    links: [
      ...(str(g.homepage) ? [{ label: "Homepage ↗", url: str(g.homepage)! }] : []),
      ...(str(g.html_url) ? [{ label: "Repository ↗", url: str(g.html_url)! }] : []),
    ],
    topics: strArr(g.topics).slice(0, 6),
  };
}

function youtubeView(r: Resource): RichView {
  const snippet = asObj(asObj(r.raw).snippet);
  const channel = str(snippet.channelTitle);
  const channelId = str(snippet.channelId);
  return {
    badge: "YouTube",
    name: str(snippet.title) ?? r.title,
    url: r.url,
    meta: [],
    description: str(snippet.description) ?? null,
    who: channel
      ? {
          label: "Channel",
          people: [
            {
              name: channel,
              url: channelId ? `https://www.youtube.com/channel/${channelId}` : undefined,
            },
          ],
        }
      : undefined,
    links: r.url ? [{ label: "Watch on YouTube ↗", url: r.url }] : [],
    topics: [],
  };
}

function huggingfaceView(r: Resource): RichView {
  const h = asObj(r.raw);
  const id = str(h.id) ?? r.title ?? "";
  const author = id.includes("/") ? id.split("/")[0] : undefined;
  const likes = num(h.likes);
  const downloads = num(h.downloads);
  return {
    badge: "Hugging Face",
    name: id || r.title,
    url: r.url ?? (id ? `https://huggingface.co/${id}` : null),
    meta: [
      likes !== undefined ? `❤️ ${likes.toLocaleString()}` : "",
      downloads !== undefined ? `⬇️ ${downloads.toLocaleString()}` : "",
      str(h.pipeline_tag) ?? "",
      str(h.library_name) ?? "",
    ].filter(Boolean),
    who: author
      ? { label: "Author", people: [{ name: author, url: `https://huggingface.co/${author}` }] }
      : undefined,
    links: r.url ? [{ label: "Model on Hugging Face ↗", url: r.url }] : [],
    // drop machine tags like "license:mit" / "arxiv:1234" — keep human-readable topics
    topics: strArr(h.tags)
      .filter((t) => !t.includes(":"))
      .slice(0, 6),
  };
}

function producthuntView(r: Resource): RichView {
  const p = asObj(r.raw);
  const topics = (Array.isArray(asObj(p.topics).edges) ? (asObj(p.topics).edges as unknown[]) : [])
    .map((e) => str(asObj(asObj(e).node).name))
    .filter((n): n is string => !!n);
  const makers = (Array.isArray(p.makers) ? (p.makers as unknown[]) : []).map(asObj);
  const votes = num(p.votesCount);
  const comments = num(p.commentsCount);
  return {
    badge: "Product Hunt",
    name: r.title,
    url: r.url,
    meta: [
      votes !== undefined ? `▲ ${votes.toLocaleString()}` : "",
      comments !== undefined ? `💬 ${comments.toLocaleString()}` : "",
    ].filter(Boolean),
    tagline: str(p.tagline),
    description: str(p.description) ?? null,
    who: makers.length
      ? {
          label: "Makers",
          people: makers.map((m) => ({
            name: str(m.name) ?? "maker",
            url: str(m.url),
            sub: str(m.username) ? `@${str(m.username)}` : undefined,
          })),
        }
      : undefined,
    links: [
      ...(str(p.website) ? [{ label: "Website ↗", url: str(p.website)! }] : []),
      ...(r.url ? [{ label: "Product Hunt ↗", url: r.url }] : []),
    ],
    topics,
  };
}

const VIEW_BY_SOURCE: Record<string, (r: Resource) => RichView> = {
  github: githubView,
  youtube: youtubeView,
  huggingface: huggingfaceView,
  producthunt: producthuntView,
};

/** A source item backing a trend. Known sources render a rich card; others render a simple row. */
export function ResourceItem({ r }: { r: Resource }) {
  const toView = VIEW_BY_SOURCE[r.source];
  if (toView && r.raw && typeof r.raw === "object") {
    return <RichResource v={toView(r)} date={r.publishedAt} />;
  }
  return (
    <li className="resource-item">
      <Badge>{sourceLabel(r.source)}</Badge>
      {r.url ? (
        <a href={r.url} target="_blank" rel="noopener noreferrer" className="resource-link">
          {r.title ?? r.url}
        </a>
      ) : (
        <span className="resource-link">{r.title ?? "(untitled)"}</span>
      )}
      {r.publishedAt && <time className="resource-date">{fmtDate(r.publishedAt)}</time>}
    </li>
  );
}

function RichResource({ v, date }: { v: RichView; date: Date | null }) {
  return (
    <li className="resource-item resource-rich">
      <div className="resource-rich-head">
        <Badge>{v.badge}</Badge>
        {v.url ? (
          <a href={v.url} target="_blank" rel="noopener noreferrer" className="resource-rich-name">
            {v.name}
          </a>
        ) : (
          <span className="resource-rich-name">{v.name}</span>
        )}
        {v.meta.map((m, i) => (
          <span key={i} className="resource-rich-meta">
            {m}
          </span>
        ))}
        {date && <time className="resource-date">{fmtDate(date)}</time>}
      </div>

      {v.tagline && <div className="resource-rich-tagline">{v.tagline}</div>}
      {v.description && <p className="resource-rich-desc">{v.description}</p>}

      {v.who && v.who.people.length > 0 && (
        <div className="resource-rich-line">
          <span className="resource-rich-label">{v.who.label}:</span>{" "}
          {v.who.people.map((p, i) => (
            <span key={i}>
              {i > 0 && ", "}
              {p.url ? (
                <a href={p.url} target="_blank" rel="noopener noreferrer">
                  {p.name}
                </a>
              ) : (
                p.name
              )}
              {p.sub ? ` (${p.sub})` : ""}
            </span>
          ))}
        </div>
      )}

      {v.links.length > 0 && (
        <div className="resource-rich-links">
          {v.links.map((l, i) => (
            <a key={i} href={l.url} target="_blank" rel="noopener noreferrer">
              {l.label}
            </a>
          ))}
        </div>
      )}

      {v.topics.length > 0 && (
        <div className="resource-rich-topics">
          {v.topics.map((t) => (
            <Badge key={t}>{t}</Badge>
          ))}
        </div>
      )}
    </li>
  );
}
