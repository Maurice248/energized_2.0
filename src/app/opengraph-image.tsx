import { ImageResponse } from "next/og";

export const alt = "Energized — jobs in Canadian energy";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0B0D12",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          color: "white",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "#0B0D12",
              border: "1px solid rgba(255,255,255,0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#1CAAE2",
              fontSize: 34,
              fontWeight: 900,
            }}
          >
            E
          </div>
          <div
            style={{
              fontSize: 30,
              fontWeight: 700,
              display: "flex",
            }}
          >
            <span>Energ</span>
            <span style={{ color: "#1CAAE2", fontStyle: "italic" }}>ized</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", maxWidth: 900 }}>
          <div
            style={{
              fontSize: 18,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.55)",
              marginBottom: 28,
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: "#1CAAE2",
              }}
            />
            <span>For Canada&apos;s energy professionals</span>
          </div>
          <div
            style={{
              fontSize: 96,
              lineHeight: 1.0,
              letterSpacing: "-0.035em",
              fontWeight: 900,
              fontStyle: "italic",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span>Careers for the energy</span>
            <span style={{ color: "#1CAAE2" }}>in motion.</span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: 28,
            borderTop: "1px solid rgba(255,255,255,0.12)",
            fontSize: 22,
            color: "rgba(255,255,255,0.7)",
          }}
        >
          <div style={{ display: "flex", gap: 20 }}>
            <span>Oil &amp; gas</span>
            <span>Renewables</span>
            <span>Nuclear</span>
            <span>Utilities</span>
            <span>Hydrogen</span>
            <span>Power</span>
          </div>
          <div style={{ color: "white", fontWeight: 700, display: "flex" }}>
            energized.biz
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
