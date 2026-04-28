import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0B0D12",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 110,
          fontWeight: 900,
          color: "#1CAAE2",
          fontStyle: "italic",
          fontFamily: "serif",
        }}
      >
        E
      </div>
    ),
    { ...size },
  );
}
