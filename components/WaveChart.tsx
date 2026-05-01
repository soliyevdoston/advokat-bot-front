"use client";

import { useId, useMemo, useState } from "react";

export type WavePoint = {
  label: string;
  value: number;
  caption?: string;
};

type WaveChartProps = {
  data: WavePoint[];
  height?: number;
  color?: string;
  gradientFrom?: string;
  gradientTo?: string;
  showAxis?: boolean;
  showDots?: boolean;
  emptyText?: string;
  formatValue?: (v: number) => string;
  ariaLabel?: string;
};

/* Catmull-Rom → Cubic Bezier — smooth interpolation through every point. */
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const tension = 0.18;
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export function WaveChart({
  data,
  height = 180,
  color = "#0a0a0a",
  gradientFrom,
  gradientTo,
  showAxis = false,
  showDots = false,
  emptyText = "Ma'lumot yo'q",
  formatValue,
  ariaLabel
}: WaveChartProps) {
  const reactId = useId();
  const gradientId = `wave-grad-${reactId.replace(/:/g, "")}`;
  const clipId = `wave-clip-${reactId.replace(/:/g, "")}`;

  const [hover, setHover] = useState<{
    index: number;
    x: number;
    y: number;
  } | null>(null);

  const VIEW_W = 800;
  const VIEW_H = height;
  const PAD_TOP = 18;
  const PAD_BOTTOM = showAxis ? 22 : 8;
  const PAD_X = 8;

  const { pathLine, pathArea, points, max, min } = useMemo(() => {
    if (data.length === 0) {
      return {
        pathLine: "",
        pathArea: "",
        points: [],
        max: 0,
        min: 0
      };
    }
    const vals = data.map((d) => d.value);
    const max = Math.max(...vals, 1);
    const min = Math.min(...vals, 0);
    const range = max - min || 1;
    const innerW = VIEW_W - PAD_X * 2;
    const innerH = VIEW_H - PAD_TOP - PAD_BOTTOM;

    const pts = data.map((d, i) => {
      const x =
        data.length === 1
          ? VIEW_W / 2
          : PAD_X + (i / (data.length - 1)) * innerW;
      const y = PAD_TOP + (1 - (d.value - min) / range) * innerH;
      return { x, y };
    });

    const line = smoothPath(pts);
    const area = `${line} L ${pts[pts.length - 1].x} ${VIEW_H} L ${pts[0].x} ${VIEW_H} Z`;

    return { pathLine: line, pathArea: area, points: pts, max, min };
  }, [data, VIEW_W, VIEW_H, PAD_X, PAD_TOP, PAD_BOTTOM]);

  if (data.length === 0) {
    return (
      <div
        style={{
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--muted)",
          fontSize: 13
        }}
      >
        {emptyText}
      </div>
    );
  }

  const fmt = formatValue ?? ((v: number) => String(v));
  const fillFrom = gradientFrom ?? color;
  const fillTo = gradientTo ?? color;

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const xPx = e.clientX - rect.left;
    const xView = (xPx / rect.width) * VIEW_W;
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < points.length; i++) {
      const dist = Math.abs(points[i].x - xView);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    setHover({ index: bestIdx, x: points[bestIdx].x, y: points[bestIdx].y });
  };

  const onLeave = () => setHover(null);

  return (
    <div className="wave-chart" style={{ position: "relative" }}>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        width="100%"
        height={height}
        preserveAspectRatio="none"
        role="img"
        aria-label={ariaLabel}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{ display: "block", overflow: "visible" }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillFrom} stopOpacity="0.35" />
            <stop offset="60%" stopColor={fillTo} stopOpacity="0.1" />
            <stop offset="100%" stopColor={fillTo} stopOpacity="0" />
          </linearGradient>
          <clipPath id={clipId}>
            <rect x="0" y="0" width={VIEW_W} height={VIEW_H} />
          </clipPath>
        </defs>

        {/* gradient area */}
        <path d={pathArea} fill={`url(#${gradientId})`} />

        {/* line */}
        <path
          d={pathLine}
          fill="none"
          stroke={color}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: 2000,
            strokeDashoffset: 0,
            animation: "wave-draw 800ms ease-out"
          }}
        />

        {/* dots */}
        {showDots &&
          points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={hover?.index === i ? 5.5 : 3}
              fill="#fff"
              stroke={color}
              strokeWidth="2"
              style={{ transition: "r 120ms" }}
            />
          ))}

        {/* hover guideline + dot */}
        {hover && (
          <g pointerEvents="none">
            <line
              x1={hover.x}
              y1={PAD_TOP}
              x2={hover.x}
              y2={VIEW_H - PAD_BOTTOM}
              stroke={color}
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.35"
            />
            <circle
              cx={hover.x}
              cy={hover.y}
              r="6"
              fill="#fff"
              stroke={color}
              strokeWidth="2.4"
            />
          </g>
        )}

        {/* axis labels (first / last) */}
        {showAxis && data.length > 1 && (
          <>
            <text
              x={PAD_X}
              y={VIEW_H - 4}
              fontSize="10"
              fill="currentColor"
              opacity="0.55"
            >
              {data[0].label}
            </text>
            <text
              x={VIEW_W - PAD_X}
              y={VIEW_H - 4}
              fontSize="10"
              textAnchor="end"
              fill="currentColor"
              opacity="0.55"
            >
              {data[data.length - 1].label}
            </text>
          </>
        )}
      </svg>

      {hover && (
        <WaveTooltip
          point={data[hover.index]}
          x={hover.x}
          y={hover.y}
          viewW={VIEW_W}
          viewH={VIEW_H}
          formatValue={fmt}
          color={color}
        />
      )}

      {showAxis && data.length >= 2 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 10,
            color: "var(--muted)",
            marginTop: 2
          }}
        >
          <span>min: {fmt(min)}</span>
          <span>max: {fmt(max)}</span>
        </div>
      )}
    </div>
  );
}

function WaveTooltip({
  point,
  x,
  y,
  viewW,
  viewH,
  formatValue,
  color
}: {
  point: WavePoint;
  x: number;
  y: number;
  viewW: number;
  viewH: number;
  formatValue: (v: number) => string;
  color: string;
}) {
  // Convert SVG coords to percentage so the tooltip lines up regardless of
  // the rendered width.
  const leftPct = (x / viewW) * 100;
  const topPct = (y / viewH) * 100;

  return (
    <div
      className="wave-tooltip"
      style={{
        position: "absolute",
        left: `${leftPct}%`,
        top: `${topPct}%`,
        transform: "translate(-50%, calc(-100% - 12px))",
        pointerEvents: "none"
      }}
    >
      <div
        style={{
          background: "var(--ink)",
          color: "#fff",
          padding: "6px 10px",
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 600,
          whiteSpace: "nowrap",
          boxShadow: "0 4px 12px rgba(0,0,0,.18)",
          borderBottom: `2px solid ${color}`
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700 }}>
          {formatValue(point.value)}
        </div>
        <div style={{ opacity: 0.7, fontSize: 11, fontWeight: 500 }}>
          {point.caption ?? point.label}
        </div>
      </div>
    </div>
  );
}
