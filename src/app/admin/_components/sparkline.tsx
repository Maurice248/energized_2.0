type Props = {
  data: number[];
  height?: number;
  stroke?: string;
  fill?: string;
  showFill?: boolean;
  className?: string;
};

export function Sparkline({
  data,
  height = 32,
  stroke = "#1CAAE2",
  fill = "rgba(28, 170, 226, 0.18)",
  showFill = true,
  className,
}: Props) {
  if (!data.length) return null;
  const width = 100;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const stepX = data.length > 1 ? width / (data.length - 1) : width;

  const points = data
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  const areaPath = showFill
    ? `M0,${height} L${points.replace(/ /g, " L")} L${width},${height} Z`
    : "";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      width="100%"
      height={height}
      className={className}
    >
      {showFill ? <path d={areaPath} fill={fill} /> : null}
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
