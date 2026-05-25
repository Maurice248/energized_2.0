type Row = { name: string; users: string; pct: number };

export function GeoList({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return (
      <div className="v2-mod-empty">
        No location data captured yet on candidate profiles.
      </div>
    );
  }
  return (
    <div className="v2-geo-grid">
      {rows.map((g) => (
        <div key={g.name} className="v2-geo-row">
          <div className="v2-geo-l">{g.name}</div>
          <div className="v2-geo-track">
            <div className="v2-geo-fill" style={{ width: `${g.pct}%` }} />
          </div>
          <div className="v2-geo-r">{g.users}</div>
        </div>
      ))}
    </div>
  );
}
