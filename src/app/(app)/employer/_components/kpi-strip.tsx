import { api } from "@/lib/trpc/server";

function Tile({
  label,
  value,
  context,
}: {
  label: string;
  value: number;
  context?: string;
}) {
  return (
    <div className="rounded-xl border p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-3xl font-black tabular-nums">{value}</div>
      {context && (
        <div className="text-xs text-muted-foreground">{context}</div>
      )}
    </div>
  );
}

export async function KpiStrip() {
  const kpis = await api.employer.getKpis();
  if (!kpis) return null;

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <Tile label="Open roles" value={kpis.openRoles} />
      <Tile
        label="Applicants"
        value={kpis.applicants30d}
        context="Last 30 days"
      />
      <Tile
        label="Profile views"
        value={kpis.profileViews30d}
        context="Last 30 days"
      />
      <Tile label="Total applicants" value={kpis.applicantsTotal} />
    </div>
  );
}
