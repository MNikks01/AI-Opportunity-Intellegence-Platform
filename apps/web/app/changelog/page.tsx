import type { Metadata } from "next";
import { CHANGELOG_ENTRIES, type ChangelogEntry } from "./entries";

export const metadata: Metadata = {
  title: "What's new",
  description:
    "Product updates for the AI Opportunity Intelligence Platform — new sources, the Golden Quadrant, build kit, team plans, API access, and more.",
};

const fmtDay = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

const monthKey = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

// Group entries (already newest-first) into month buckets, preserving order.
function byMonth(entries: ChangelogEntry[]): [string, ChangelogEntry[]][] {
  const out: [string, ChangelogEntry[]][] = [];
  for (const e of entries) {
    const key = monthKey(e.date);
    const bucket = out.find(([k]) => k === key);
    if (bucket) bucket[1].push(e);
    else out.push([key, [e]]);
  }
  return out;
}

export default function ChangelogPage() {
  const months = byMonth(CHANGELOG_ENTRIES);

  return (
    <main className="changelog">
      <header className="changelog-head">
        <span className="changelog-eyebrow">What&rsquo;s new</span>
        <h1>Product updates</h1>
        <p>
          The latest improvements to the platform. Want them in your reader?{" "}
          <a href="/feed.xml">Subscribe to the RSS feed</a>.
        </p>
      </header>

      {months.map(([month, entries]) => (
        <section key={month} className="changelog-month" aria-label={month}>
          <h2 className="changelog-month-label">{month}</h2>
          <ol className="changelog-list">
            {entries.map((e) => (
              <li key={`${e.date}-${e.title}`} className="changelog-item">
                <div className="changelog-meta">
                  <span className={`changelog-tag tag-${e.tag.toLowerCase()}`}>{e.tag}</span>
                  <time dateTime={e.date}>{fmtDay(e.date)}</time>
                </div>
                <div className="changelog-body">
                  <h3>{e.title}</h3>
                  <p>{e.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </main>
  );
}
