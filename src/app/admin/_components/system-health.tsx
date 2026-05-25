type Service = {
  slug: string;
  name: string;
  state: string;
  tone: "warn" | "crit" | "";
  ping: string;
  uptimePct: number;
};

type Props = {
  services: Service[];
  uptime30dPct: number;
  p95LatencyMs: number | null;
  totalActive: number;
  operationalCount: number;
  degradedCount: number;
  outageCount: number;
  stripeDegradedSince: Date | null;
};

function formatDuration(since: Date | null): string {
  if (!since) return "—";
  const diff = Date.now() - since.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${Math.max(1, mins)}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export function SystemHealth({
  services,
  uptime30dPct,
  p95LatencyMs,
  totalActive,
  operationalCount,
  degradedCount,
  outageCount,
  stripeDegradedSince,
}: Props) {
  const tone = outageCount > 0 ? "crit" : degradedCount > 0 ? "warn" : "";
  const headlineLabel =
    outageCount > 0
      ? "Outage"
      : degradedCount > 0
        ? "Partial degradation"
        : "Nominal";

  return (
    <div className="v2-sys-card">
      <span className="v2-sys-eye">System health · realtime</span>
      <h3 className="v2-sys-title">
        Energ<em>ized</em>
      </h3>
      <div className="v2-sys-grid">
        <div className="v2-sys-stat">
          <div className="v2-sys-stat-l">Uptime · 30d</div>
          <div className="v2-sys-stat-v">
            {uptime30dPct.toFixed(2)}
            <em>%</em>
          </div>
        </div>
        <div className="v2-sys-stat">
          <div className="v2-sys-stat-l">Latency · p95</div>
          <div className={`v2-sys-stat-v ${tone}`}>
            {p95LatencyMs ?? "—"}
            <em>ms</em>
          </div>
        </div>
        <div className="v2-sys-stat">
          <div className="v2-sys-stat-l">Active services</div>
          <div className="v2-sys-stat-v">
            {operationalCount}
            <em>/{totalActive}</em>
          </div>
        </div>
        <div className="v2-sys-stat">
          <div className="v2-sys-stat-l">{headlineLabel}</div>
          <div className={`v2-sys-stat-v ${tone}`}>
            {stripeDegradedSince ? formatDuration(stripeDegradedSince) : "0"}
            <em>{stripeDegradedSince ? "" : "open"}</em>
          </div>
        </div>
      </div>
      <div className="v2-sys-services">
        {services.map((s) => (
          <div key={s.slug} className="v2-sys-svc">
            <div className="v2-sys-svc-name">{s.name}</div>
            <div className={`v2-sys-svc-state ${s.tone}`}>{s.state}</div>
            <div className="v2-sys-svc-ping">{s.ping}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
