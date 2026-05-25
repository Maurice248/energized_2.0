type Point = { d: string; mrr: number; new: number; churn: number };

type Props = { data: Point[] };

const HEIGHT = 220;
const PAD_L = 36;
const PAD_R = 8;
const PAD_T = 12;
const PAD_B = 28;

export function RevenueChart({ data }: Props) {
  if (!data.length) {
    return (
      <div className="v2-tbl-empty" style={{ height: HEIGHT }}>
        Not enough revenue data yet — the daily snapshot runs at 00:05 UTC.
      </div>
    );
  }

  const width = 800; // viewBox; scales responsively via CSS
  const innerW = width - PAD_L - PAD_R;
  const innerH = HEIGHT - PAD_T - PAD_B;

  const maxMrr = Math.max(...data.map((p) => p.mrr), 10);
  const yAxisMax = Math.ceil(maxMrr / 50) * 50 || 50;
  const step = innerW / Math.max(data.length - 1, 1);

  const points = data.map((p, i) => ({
    x: PAD_L + i * step,
    y: PAD_T + innerH - (p.mrr / yAxisMax) * innerH,
    d: p.d,
    mrr: p.mrr,
  }));

  const linePath = points
    .map((pt, i) => (i === 0 ? `M${pt.x},${pt.y}` : `L${pt.x},${pt.y}`))
    .join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x},${
    PAD_T + innerH
  } L${points[0].x},${PAD_T + innerH} Z`;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((p) => ({
    value: Math.round(yAxisMax * p),
    y: PAD_T + innerH - p * innerH,
  }));

  return (
    <div className="v2-achart-wrap">
      <svg
        viewBox={`0 0 ${width} ${HEIGHT}`}
        preserveAspectRatio="none"
        width="100%"
        height={HEIGHT}
        role="img"
        aria-label="Monthly recurring revenue"
      >
        <defs>
          <linearGradient id="adminMrrGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#1CAAE2" stopOpacity={0.32} />
            <stop offset="100%" stopColor="#1CAAE2" stopOpacity={0} />
          </linearGradient>
        </defs>

        {yTicks.map((tick) => (
          <g key={tick.value}>
            <line
              x1={PAD_L}
              x2={width - PAD_R}
              y1={tick.y}
              y2={tick.y}
              stroke="#EEF3F8"
              strokeWidth={1}
            />
            <text
              x={PAD_L - 6}
              y={tick.y + 3}
              textAnchor="end"
              fontFamily="Lato, sans-serif"
              fontSize={11}
              fill="#97A2B0"
              fontWeight={700}
            >
              ${tick.value}k
            </text>
          </g>
        ))}

        <path d={areaPath} fill="url(#adminMrrGradient)" />
        <path d={linePath} fill="none" stroke="#1CAAE2" strokeWidth={2.2} />

        {points.map((pt, i) => (
          <circle
            key={i}
            cx={pt.x}
            cy={pt.y}
            r={2.5}
            fill="#FFFFFF"
            stroke="#1CAAE2"
            strokeWidth={1.4}
          />
        ))}

        {points.map((pt, i) => {
          if (data.length > 12 && i % 2 !== 0) return null;
          return (
            <text
              key={`x-${i}`}
              x={pt.x}
              y={HEIGHT - 8}
              textAnchor="middle"
              fontFamily="Lato, sans-serif"
              fontSize={11}
              fill="#97A2B0"
              fontWeight={700}
            >
              {pt.d}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
