import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "DawaiSathi — Understand Your Medicine In Your Language";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0a0f0a",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px",
        }}
      >
        {/* Logo row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            marginBottom: "32px",
          }}
        >
          <span style={{ fontSize: 80 }}>💊</span>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontSize: 72,
                fontWeight: 700,
                color: "#ffffff",
                letterSpacing: "-2px",
                lineHeight: 1,
              }}
            >
              DawaiSathi
            </span>
            <span
              style={{
                fontSize: 36,
                color: "#fbe2a7",
                marginTop: "6px",
                letterSpacing: "2px",
              }}
            >
              दवाई साथी
            </span>
          </div>
        </div>

        {/* Tagline */}
        <p
          style={{
            fontSize: 28,
            color: "#a8bec9",
            textAlign: "center",
            maxWidth: "800px",
            margin: 0,
            lineHeight: 1.4,
          }}
        >
          Understand your medicine in your language
        </p>

        {/* Language pills */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            marginTop: "40px",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {["हिंदी", "ಕನ್ನಡ", "தமிழ்", "తెలుగు", "മലയാളം", "বাংলা"].map(
            (lang) => (
              <span
                key={lang}
                style={{
                  background: "rgba(251,226,167,0.12)",
                  border: "1px solid rgba(251,226,167,0.3)",
                  color: "#fbe2a7",
                  padding: "8px 20px",
                  borderRadius: "100px",
                  fontSize: 22,
                }}
              >
                {lang}
              </span>
            )
          )}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
