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

/** Shape of the Product Hunt raw node (see the producthunt connector). All fields optional/defensive. */
type PHNode = {
  tagline?: string;
  description?: string | null;
  website?: string | null;
  votesCount?: number;
  commentsCount?: number;
  topics?: { edges?: { node?: { name?: string } }[] };
  makers?: { name?: string; username?: string; url?: string; headline?: string | null }[];
};

/** A source item backing a trend. Product Hunt renders a rich card; other sources render a simple row. */
export function ResourceItem({ r }: { r: Resource }) {
  if (r.source === "producthunt" && r.raw && typeof r.raw === "object") {
    return <ProductHuntItem r={r} p={r.raw as PHNode} />;
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

function ProductHuntItem({ r, p }: { r: Resource; p: PHNode }) {
  const topics = (p.topics?.edges ?? []).map((e) => e.node?.name).filter((n): n is string => !!n);
  const makers = (p.makers ?? []).filter((m) => m.name);
  return (
    <li className="resource-item resource-ph">
      <div className="resource-ph-head">
        <Badge>Product Hunt</Badge>
        {r.url ? (
          <a href={r.url} target="_blank" rel="noopener noreferrer" className="resource-ph-name">
            {r.title}
          </a>
        ) : (
          <span className="resource-ph-name">{r.title}</span>
        )}
        {typeof p.votesCount === "number" && (
          <span className="resource-ph-meta">▲ {p.votesCount}</span>
        )}
        {typeof p.commentsCount === "number" && (
          <span className="resource-ph-meta">💬 {p.commentsCount}</span>
        )}
        {r.publishedAt && <time className="resource-date">{fmtDate(r.publishedAt)}</time>}
      </div>

      {p.tagline && <div className="resource-ph-tagline">{p.tagline}</div>}
      {p.description && <p className="resource-ph-desc">{p.description}</p>}

      {makers.length > 0 && (
        <div className="resource-ph-line">
          <span className="resource-ph-label">Makers:</span>{" "}
          {makers.map((m, i) => (
            <span key={m.username ?? i}>
              {i > 0 && ", "}
              {m.url ? (
                <a href={m.url} target="_blank" rel="noopener noreferrer">
                  {m.name}
                </a>
              ) : (
                m.name
              )}
              {m.username ? ` (@${m.username})` : ""}
            </span>
          ))}
        </div>
      )}

      {(p.website || r.url) && (
        <div className="resource-ph-links">
          {p.website && (
            <a href={p.website} target="_blank" rel="noopener noreferrer">
              Website ↗
            </a>
          )}
          {r.url && (
            <a href={r.url} target="_blank" rel="noopener noreferrer">
              Product Hunt ↗
            </a>
          )}
        </div>
      )}

      {topics.length > 0 && (
        <div className="resource-ph-topics">
          {topics.map((t) => (
            <Badge key={t}>{t}</Badge>
          ))}
        </div>
      )}
    </li>
  );
}
