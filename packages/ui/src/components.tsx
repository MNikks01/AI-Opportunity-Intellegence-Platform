import type { ReactNode } from "react";
import { INVERTED_DIMENSIONS, type Score, type ScoreBand, type ScoreDimension } from "@aioi/shared";

/** Dimensions whose display label is an acronym (not title-cased). */
const ACRONYM_LABELS: Partial<Record<ScoreDimension, string>> = {
  seo: "SEO",
};

function humanize(dim: ScoreDimension): string {
  const acronym = ACRONYM_LABELS[dim];
  if (acronym) return acronym;
  const spaced = dim.replace(/([A-Z])/g, " $1");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`aioi-card ${className ?? ""}`.trim()}>{children}</div>;
}

export function Badge({ band, children }: { band?: ScoreBand; children: ReactNode }) {
  return (
    <span className="aioi-badge" data-band={band}>
      {children}
    </span>
  );
}

export function ScoreBar({ score }: { score: Score }) {
  const inverted = INVERTED_DIMENSIONS.includes(score.dimension);
  return (
    <div className="aioi-scorebar" title={`confidence ${score.confidence}`}>
      <span className="aioi-scorebar__label">
        {humanize(score.dimension)}
        {inverted ? " ↓" : ""}
      </span>
      <span className="aioi-scorebar__track">
        <span
          className="aioi-scorebar__fill"
          data-band={score.band}
          style={{ width: `${score.value}%` }}
        />
      </span>
      <span className="aioi-scorebar__value">{score.value}</span>
    </div>
  );
}

/** Full scorecard: composite opportunity first, then sub-dimensions. */
export function Scorecard({ scores }: { scores: Score[] }) {
  const opportunity = scores.find((s) => s.dimension === "opportunity");
  const rest = scores.filter((s) => s.dimension !== "opportunity");
  return (
    <Card>
      {opportunity && (
        <div style={{ marginBottom: "var(--space-4)" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-3)" }}>
            <span style={{ fontSize: "2rem", fontWeight: 600, fontFamily: "var(--font-mono)" }}>
              {opportunity.value}
            </span>
            <Badge band={opportunity.band}>Opportunity · {opportunity.band}</Badge>
          </div>
          <p style={{ color: "var(--fg-muted)", fontSize: "0.8125rem", margin: "4px 0 0" }}>
            {opportunity.rationale}
          </p>
        </div>
      )}
      {rest.map((s) => (
        <ScoreBar key={s.dimension} score={s} />
      ))}
      <p style={{ color: "var(--fg-muted)", fontSize: "0.6875rem", marginTop: "var(--space-3)" }}>
        ↓ = inverted (high is worse). Rubric {opportunity?.rubricVersion ?? rest[0]?.rubricVersion}.
      </p>
    </Card>
  );
}

export interface TrendSummaryProps {
  slug: string;
  title: string;
  summary?: string | null;
  scores: Score[];
  /** A teaser from the trend's action plan (B-021), shown on the card when one exists. */
  plan?: { topIdea: string | null; productNames: string[] } | null;
}

export function TrendCard({ slug, title, summary, scores, plan }: TrendSummaryProps) {
  const opp = scores.find((s) => s.dimension === "opportunity");
  const top = scores.filter((s) => s.dimension !== "opportunity").slice(0, 3);
  return (
    <a href={`/trends/${slug}`}>
      <Card className="aioi-card--hover">
        <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-3)" }}>
          <strong style={{ fontSize: "0.95rem" }}>{title}</strong>
          {opp && <Badge band={opp.band}>{opp.value}</Badge>}
        </div>
        {summary && (
          <p style={{ color: "var(--fg-muted)", fontSize: "0.8125rem", margin: "6px 0 10px" }}>
            {summary}
          </p>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {top.map((s) => (
            <Badge key={s.dimension} band={s.band}>
              {humanize(s.dimension)} {s.value}
            </Badge>
          ))}
        </div>
        {plan?.topIdea && (
          <div
            style={{
              marginTop: "10px",
              paddingTop: "10px",
              borderTop: "1px solid var(--border)",
            }}
          >
            <div style={{ fontSize: "0.6875rem", color: "var(--fg-muted)", marginBottom: "3px" }}>
              💡 Build idea
            </div>
            <div style={{ fontSize: "0.8125rem", color: "var(--fg)", lineHeight: 1.35 }}>
              {plan.topIdea}
            </div>
            {plan.productNames.length > 0 && (
              <div style={{ marginTop: "6px", display: "flex", flexWrap: "wrap", gap: "4px" }}>
                {plan.productNames.map((n) => (
                  <Badge key={n}>{n}</Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>
    </a>
  );
}
