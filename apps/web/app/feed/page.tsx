import type { Metadata } from "next";
import { listCategories, listNews, searchSignalsHybrid, type SignalHit } from "@aioi/database";
import { getSiteUrl } from "../lib/site";
import { REGION_ORDER, regionFlag, regionLabel } from "../lib/regions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI & Tech News",
  description:
    "The latest AI & technology news, analyzed for opportunity — what happened, why it matters, and what you can build, learn, or invest in.",
  alternates: { canonical: `${getSiteUrl()}/feed` },
};

const SORTS = [
  { key: "recent", label: "Most recent" },
  { key: "opportunity", label: "Opportunity" },
  { key: "impact", label: "Impact" },
] as const;

function fmtDate(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function scoreClass(v: number | null): string {
  if (v === null) return "";
  return v >= 67 ? "news-score-high" : v >= 34 ? "news-score-mid" : "news-score-low";
}

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    region?: string;
    category?: string;
    sort?: string;
  }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const region = sp.region?.trim() || undefined;
  const category = sp.category?.trim() || undefined;
  const sort = (sp.sort?.trim() as "recent" | "opportunity" | "impact") || "recent";

  const categories = await listCategories();
  const filters = { region, categoryKey: category, sinceDays: undefined };
  const items: SignalHit[] = q
    ? await searchSignalsHybrid(q, filters, 40)
    : await listNews(filters, sort, 40);

  return (
    <main>
      <h1 style={{ fontSize: "1.5rem", margin: "0 0 4px" }}>AI &amp; Tech News</h1>
      <p style={{ color: "var(--fg-muted)", margin: "0 0 16px" }}>
        Every story analyzed for opportunity — what happened, why it matters, and what you can
        build, learn, or invest in.
      </p>

      <form method="GET" action="/feed" className="news-filters" role="search">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search news…"
          aria-label="Search news"
          className="news-search"
        />
        <select name="region" defaultValue={region ?? ""} aria-label="Filter by region">
          <option value="">All regions</option>
          {REGION_ORDER.map((r) => (
            <option key={r} value={r}>
              {regionFlag(r)} {regionLabel(r)}
            </option>
          ))}
        </select>
        <select name="category" defaultValue={category ?? ""} aria-label="Filter by category">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.key} value={c.key}>
              {c.name}
            </option>
          ))}
        </select>
        <select name="sort" defaultValue={sort} aria-label="Sort by" disabled={q.length > 0}>
          {SORTS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
        <button type="submit" className="news-filter-btn">
          Filter
        </button>
      </form>

      {items.length === 0 ? (
        <div className="aioi-card" style={{ color: "var(--fg-muted)", marginTop: 16 }}>
          No analyzed news yet for these filters. The feed fills in as sources are ingested and the
          analysis pass runs.
        </div>
      ) : (
        <ul className="news-list" aria-label="News feed">
          {items.map((it) => (
            <li key={it.id}>
              <a href={`/feed/${it.id}`} className="news-card">
                <div className="news-card-head">
                  <span className="news-region" title={regionLabel(it.region)}>
                    {regionFlag(it.region)} {regionLabel(it.region)}
                  </span>
                  <span className="news-date">{fmtDate(it.publishedAt)}</span>
                </div>
                <h2 className="news-title">{it.title ?? "Untitled"}</h2>
                {it.tldr && <p className="news-tldr">{it.tldr}</p>}
                <div className="news-card-foot">
                  {it.opportunityScore !== null && (
                    <span className={`news-score ${scoreClass(it.opportunityScore)}`}>
                      Opportunity {it.opportunityScore}
                    </span>
                  )}
                  {it.impactScore !== null && (
                    <span className="news-chip">Impact {it.impactScore}</span>
                  )}
                  {it.categories.slice(0, 3).map((c) => (
                    <span key={c} className="news-chip">
                      {c}
                    </span>
                  ))}
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
