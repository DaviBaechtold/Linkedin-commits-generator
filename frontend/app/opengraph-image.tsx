import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: 1200,
          height: 630,
          background: "#0A0A0C",
          padding: "72px 80px",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        {/* Logo row */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 56 }}>
          <div
            style={{
              width: 56,
              height: 56,
              background: "#0A66C2",
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="6" y1="3" x2="6" y2="15" />
              <circle cx="18" cy="6" r="3" />
              <circle cx="6" cy="18" r="3" />
              <path d="M18 9a9 9 0 0 1-9 9" />
            </svg>
          </div>
          <span style={{ fontSize: 30, fontWeight: 700, color: "white", letterSpacing: "-0.5px" }}>
            CommitPost
          </span>
        </div>

        {/* Headline line 1 */}
        <div style={{ display: "flex", marginBottom: 8 }}>
          <span
            style={{
              fontSize: 68,
              fontWeight: 800,
              color: "white",
              lineHeight: 1.05,
              letterSpacing: "-2px",
            }}
          >
            LinkedIn posts from
          </span>
        </div>

        {/* Headline line 2 — accent color */}
        <div style={{ display: "flex", marginBottom: 36 }}>
          <span
            style={{
              fontSize: 68,
              fontWeight: 800,
              color: "#378FE9",
              lineHeight: 1.05,
              letterSpacing: "-2px",
            }}
          >
            your git history
          </span>
        </div>

        {/* Pills */}
        <div style={{ display: "flex", gap: 12, marginBottom: "auto" }}>
          {["BYOK", "NDA filter", "Auto-post", "Free"].map((tag) => (
            <div
              key={tag}
              style={{
                display: "flex",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 24,
                padding: "8px 20px",
                fontSize: 22,
                color: "rgba(255,255,255,0.55)",
                fontWeight: 500,
              }}
            >
              {tag}
            </div>
          ))}
        </div>

        {/* URL */}
        <div style={{ display: "flex" }}>
          <span style={{ fontSize: 22, color: "rgba(255,255,255,0.25)", fontWeight: 500 }}>
            commitpost.vercel.app
          </span>
        </div>

        {/* Right decoration — abstract commit graph */}
        <div
          style={{
            position: "absolute",
            right: 80,
            top: 72,
            bottom: 72,
            width: 320,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: 0.12,
          }}
        >
          <svg width="280" height="480" viewBox="0 0 280 480" fill="none">
            <line x1="60" y1="0" x2="60" y2="480" stroke="#378FE9" strokeWidth="2" />
            <line x1="140" y1="80" x2="140" y2="400" stroke="#378FE9" strokeWidth="2" />
            <line x1="220" y1="160" x2="220" y2="320" stroke="#378FE9" strokeWidth="2" />
            <path d="M60 160 C60 200 140 200 140 240" stroke="#378FE9" strokeWidth="2" fill="none" />
            <path d="M140 240 C140 280 60 280 60 320" stroke="#378FE9" strokeWidth="2" fill="none" />
            <path d="M140 200 C140 230 220 230 220 260" stroke="#378FE9" strokeWidth="2" fill="none" />
            <circle cx="60" cy="60" r="8" fill="#0A66C2" />
            <circle cx="60" cy="120" r="8" fill="#0A66C2" />
            <circle cx="60" cy="180" r="8" fill="#0A66C2" />
            <circle cx="60" cy="280" r="8" fill="#0A66C2" />
            <circle cx="60" cy="360" r="8" fill="#0A66C2" />
            <circle cx="60" cy="420" r="8" fill="#0A66C2" />
            <circle cx="140" cy="160" r="8" fill="#0A66C2" />
            <circle cx="140" cy="240" r="8" fill="#0A66C2" />
            <circle cx="140" cy="320" r="8" fill="#0A66C2" />
            <circle cx="220" cy="200" r="8" fill="#0A66C2" />
            <circle cx="220" cy="260" r="8" fill="#0A66C2" />
          </svg>
        </div>
      </div>
    ),
    { ...size }
  );
}
