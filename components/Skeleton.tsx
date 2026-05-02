/** Skeleton primitives — use className="sk" for the shimmer effect. */

interface LineProps { w?: string | number; h?: number; mb?: number; }
interface BlockProps { h?: number; w?: string | number; mb?: number; radius?: number; }

function Line({ w = "100%", h = 14, mb = 0 }: LineProps) {
  return (
    <div className="sk" style={{
      width: w, height: h, marginBottom: mb,
      borderRadius: 5,
    }} />
  );
}

function Block({ h = 80, w = "100%", mb = 0, radius = 10 }: BlockProps) {
  return (
    <div className="sk" style={{ width: w, height: h, marginBottom: mb, borderRadius: radius }} />
  );
}

function Card({ rows = 3, gap = 10 }: { rows?: number; gap?: number }) {
  return (
    <div className="surface panel" style={{ display: "flex", flexDirection: "column", gap }}>
      {Array.from({ length: rows }, (_, i) => (
        <Line key={i} w={i === 0 ? "45%" : i % 3 === 2 ? "70%" : "90%"} h={i === 0 ? 16 : 13} />
      ))}
    </div>
  );
}

function StatGrid({ cols = 4 }: { cols?: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 14, marginBottom: 20 }}>
      {Array.from({ length: cols }, (_, i) => (
        <div key={i} className="surface panel" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Line w="50%" h={11} />
          <Line w="65%" h={30} />
          <Line w="40%" h={11} />
        </div>
      ))}
    </div>
  );
}

function Table({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="surface" style={{ overflow: "hidden", borderRadius: 12 }}>
      {/* header */}
      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 8, padding: "12px 16px",
        borderBottom: "1px solid var(--border)",
        background: "var(--bg)",
      }}>
        {Array.from({ length: cols }, (_, i) => <Line key={i} h={11} w="60%" />)}
      </div>
      {/* rows */}
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: 8, padding: "14px 16px",
          borderBottom: r < rows - 1 ? "1px solid var(--border)" : "none",
        }}>
          {Array.from({ length: cols }, (_, c) => (
            <Line key={c} h={13} w={c === 0 ? "80%" : c === cols - 1 ? "50%" : "70%"} />
          ))}
        </div>
      ))}
    </div>
  );
}

function Hero() {
  return (
    <div className="sk" style={{ height: 200, borderRadius: 18, marginBottom: 24 }} />
  );
}

function PageHeader() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
      <div className="sk" style={{ width: 200, height: 26, borderRadius: 6 }} />
      <div className="sk" style={{ width: 100, height: 36, borderRadius: 8 }} />
    </div>
  );
}

export const Sk = { Line, Block, Card, StatGrid, Table, Hero, PageHeader };
