import { ImageResponse } from "next/og";

// Social preview card (LinkedIn, X, Slack, WhatsApp). Rendered once at build time.
export const alt = "Career OS: AI Career Operating System";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const features = [
  "Live job search",
  "ATS scoring",
  "Job matching",
  "RAG advisor",
  "Skill forecasts",
];

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "linear-gradient(135deg, #0a1815 0%, #12302b 60%, #1d3a2f 100%)",
          color: "#eef7f4",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -160,
            right: -120,
            width: 520,
            height: 520,
            borderRadius: 9999,
            background: "radial-gradient(circle, rgba(242,172,76,0.35) 0%, rgba(242,172,76,0) 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -200,
            left: -140,
            width: 560,
            height: 560,
            borderRadius: 9999,
            background: "radial-gradient(circle, rgba(45,170,150,0.35) 0%, rgba(45,170,150,0) 70%)",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "linear-gradient(135deg, #1f8f7f 0%, #f2ac4c 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
              fontWeight: 800,
              color: "#0a1815",
            }}
          >
            OS
          </div>
          <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: -0.5 }}>Career OS</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>
            Your AI Career
          </div>
          <div
            style={{
              fontSize: 76,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -2,
              color: "#f2ac4c",
            }}
          >
            Operating System
          </div>
          <div style={{ marginTop: 26, fontSize: 28, color: "#b5cdc6", maxWidth: 900 }}>
            Real jobs ingested nightly, resume scoring, personalised matches and an AI advisor
            grounded in live market data.
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {features.map((f) => (
            <div
              key={f}
              style={{
                display: "flex",
                padding: "10px 20px",
                borderRadius: 9999,
                border: "1.5px solid rgba(238,247,244,0.25)",
                background: "rgba(238,247,244,0.06)",
                fontSize: 22,
                color: "#dcebe6",
              }}
            >
              {f}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
