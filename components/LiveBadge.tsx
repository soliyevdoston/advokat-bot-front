"use client";

export function LiveBadge() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: "#16a34a", letterSpacing: 0.5 }}>
      <span style={{
        width: 7, height: 7, borderRadius: "50%", background: "#16a34a",
        animation: "livePulse 1.8s ease-in-out infinite",
        display: "inline-block",
      }} />
      LIVE
    </span>
  );
}
