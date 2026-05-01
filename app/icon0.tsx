import { ImageResponse } from "next/og";

// Maskable icon for Android: subject lives inside the safe zone (~80% of canvas).
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function MaskableIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0a0a0a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <div
          style={{
            width: "60%",
            height: "60%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 220,
            fontWeight: 800,
            fontFamily: "system-ui, sans-serif"
          }}
        >
          ⚖
        </div>
      </div>
    ),
    { ...size }
  );
}
