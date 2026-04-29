type Bucket = { at: Date; applications: number; reviewedOrDeeper: number };

export function AreaChart({
  series,
  height = 220,
}: {
  series: Bucket[];
  height?: number;
}) {
  const w = 760;
  const h = height;
  const pad = { l: 40, r: 16, t: 12, b: 24 };
  const cw = w - pad.l - pad.r;
  const ch = h - pad.t - pad.b;

  const max = Math.max(
    ...series.map((d) => Math.max(d.applications, d.reviewedOrDeeper)),
    1,
  ) * 1.1;

  const xs = series.map((_, i) =>
    pad.l + (series.length === 1 ? cw / 2 : (i / (series.length - 1)) * cw),
  );
  const yA = series.map((d) => pad.t + (1 - d.applications / max) * ch);
  const yS = series.map((d) => pad.t + (1 - d.reviewedOrDeeper / max) * ch);

  const grid = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    y: pad.t + t * ch,
    label: Math.round(max * (1 - t)),
  }));

  const lineA = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x},${yA[i]}`).join(" ");
  const fillA =
    lineA + ` L${xs[xs.length - 1]},${pad.t + ch} L${xs[0]},${pad.t + ch} Z`;
  const lineS = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x},${yS[i]}`).join(" ");
  const fillS =
    lineS + ` L${xs[xs.length - 1]},${pad.t + ch} L${xs[0]},${pad.t + ch} Z`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={{ width: "100%", height }}
    >
      <defs>
        <linearGradient id="ac-grad-a" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1CAAE2" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#1CAAE2" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="ac-grad-s" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#004984" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#004984" stopOpacity="0" />
        </linearGradient>
      </defs>
      {grid.map((g, i) => (
        <g key={i}>
          <line
            x1={pad.l}
            x2={w - pad.r}
            y1={g.y}
            y2={g.y}
            stroke="#E4E7EE"
            strokeWidth="1"
            strokeDasharray={i === grid.length - 1 ? "" : "2 4"}
          />
          <text
            x="0"
            y={g.y + 3}
            fontFamily="Lato, system-ui, sans-serif"
            fontSize="10"
            fill="#9CA3AF"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {g.label}
          </text>
        </g>
      ))}
      <path d={fillA} fill="url(#ac-grad-a)" />
      <path d={lineA} fill="none" stroke="#1CAAE2" strokeWidth="2" />
      <path d={fillS} fill="url(#ac-grad-s)" />
      <path
        d={lineS}
        fill="none"
        stroke="#004984"
        strokeWidth="2"
        strokeDasharray="4 3"
      />
      {series.length > 0 && (
        <>
          <circle
            cx={xs[xs.length - 1]}
            cy={yA[yA.length - 1]}
            r="4"
            fill="white"
            stroke="#1CAAE2"
            strokeWidth="2"
          />
          <circle
            cx={xs[xs.length - 1]}
            cy={yS[yS.length - 1]}
            r="4"
            fill="white"
            stroke="#004984"
            strokeWidth="2"
          />
        </>
      )}
    </svg>
  );
}
