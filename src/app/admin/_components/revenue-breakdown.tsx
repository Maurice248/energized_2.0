type Bucket = {
  key: string;
  label: string;
  cents: number;
  amount: string;
  pct: number;
  color: string;
};

export function RevenueBreakdown({ buckets }: { buckets: Bucket[] }) {
  const total = buckets.reduce((sum, b) => sum + b.cents, 0);
  if (total === 0) {
    return (
      <div className="v2-mod-empty">
        Revenue breakdown will appear once Stripe is connected and the daily
        snapshot has run.
      </div>
    );
  }
  return (
    <div className="v2-rev-list">
      {buckets.map((b) => (
        <div key={b.key} className="v2-rev-item">
          <div className="v2-rev-l">
            <span
              style={{
                display: "inline-block",
                width: 10,
                height: 10,
                borderRadius: 3,
                background: b.color,
                marginRight: 8,
              }}
            />
            {b.label}
          </div>
          <div className="v2-rev-r">
            {b.amount} <span style={{ opacity: 0.5 }}>· {b.pct}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}
