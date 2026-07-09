import { ImageResponse } from "next/og";
import { getTrendOg } from "@aioi/database";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs"; // Prisma needs the Node runtime
export const alt = "AI opportunity";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = await getTrendOg(slug);
  const title = (t?.title ?? "AI Opportunity").slice(0, 100);
  const opp = t?.opportunity ?? null;
  const idea = t?.topIdea ? t.topIdea.slice(0, 110) : null;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 64,
        background: "linear-gradient(135deg, #0d0e13 0%, #14161f 100%)",
        color: "#edeff4",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: "#9a9af2" }}>
          AI Opportunity Intelligence
        </div>
        {opp !== null && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              border: "3px solid #2dd4bf",
              borderRadius: 24,
              padding: "14px 26px",
            }}
          >
            <div style={{ display: "flex", fontSize: 66, fontWeight: 800, color: "#2dd4bf" }}>
              {opp}
            </div>
            <div style={{ display: "flex", fontSize: 18, letterSpacing: 2, color: "#9aa1b3" }}>
              OPPORTUNITY
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          fontSize: title.length > 60 ? 60 : 72,
          fontWeight: 800,
          lineHeight: 1.1,
          letterSpacing: -1,
        }}
      >
        {title}
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {idea && (
          <div style={{ display: "flex", fontSize: 30, color: "#c7ccd8", marginBottom: 14 }}>
            Build idea: {idea}
          </div>
        )}
        <div style={{ display: "flex", fontSize: 24, color: "#6b7283" }}>
          Scored on 10 opportunity dimensions · with a build plan
        </div>
      </div>
    </div>,
    size,
  );
}
