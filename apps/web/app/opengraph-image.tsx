import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";
export const alt = "AI Opportunity Intelligence";

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 80,
        background: "linear-gradient(135deg, #0d0e13 0%, #14161f 100%)",
        color: "#edeff4",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 30,
          fontWeight: 700,
          color: "#9a9af2",
          marginBottom: 28,
        }}
      >
        AI Opportunity Intelligence
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 82,
          fontWeight: 800,
          lineHeight: 1.05,
          letterSpacing: -2,
        }}
      >
        See what to build before it&rsquo;s a trend.
      </div>
      <div
        style={{ display: "flex", fontSize: 32, color: "#9aa1b3", marginTop: 30, maxWidth: 940 }}
      >
        Leading-indicator signals → scored opportunities → a buildable plan.
      </div>
    </div>,
    size,
  );
}
