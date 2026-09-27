import { ImageResponse } from "next/og";

// Home-screen icon: the logo's three bars, full-bleed (iOS rounds the corners itself).
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  const bar = (top: number, width: number, color: string, opacity = 1) => (
    <div style={{ position: "absolute", left: 45, top, width, height: 18, borderRadius: 9, background: color, opacity }} />
  );
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#16150f" }}>
        {bar(49, 90, "#c9f25d")}
        {bar(81, 90, "#f3f0e8", 0.28)}
        {bar(113, 60, "#c9f25d")}
      </div>
    ),
    size
  );
}
