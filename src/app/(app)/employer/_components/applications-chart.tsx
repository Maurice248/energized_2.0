import { api } from "@/lib/trpc/server";
import { rangeLabel, type Range } from "@/lib/range";
import { AreaChart } from "./charts/area-chart";

function formatTickDate(
  d: Date,
  granularity: "day" | "week" | "month"
): string {
  if (granularity === "month") {
    return d.toLocaleDateString("en-CA", { month: "short", year: "2-digit" });
  }
  return d.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

export async function ApplicationsChart({ range }: { range: Range }) {
  const { buckets, granularity } = await api.employer.getApplicationsTimeseries(
    { range }
  );

  if (buckets.length === 0) {
    return (
      <div className="rounded-xl border p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          Applications
        </div>
        <div className="mt-1 text-base font-bold">
          Pipeline <em className="not-italic font-black">velocity</em>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">No applications yet.</p>
      </div>
    );
  }

  const totalApps = buckets.reduce((s, b) => s + b.applications, 0);
  const totalReviewed = buckets.reduce((s, b) => s + b.reviewedOrDeeper, 0);

  // X-axis ticks: pick ~6-8 evenly-spaced labels.
  const tickStride = Math.max(1, Math.ceil(buckets.length / 7));
  const ticks = buckets.filter((_, i) => i % tickStride === 0);

  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Applications
          </div>
          <div className="text-base font-bold">
            Pipeline <em className="not-italic font-black">velocity</em>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">{rangeLabel(range)}</div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: "#1CAAE2" }}
          />
          Applied · {totalApps}
        </div>
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-0.5 w-3"
            style={{ background: "#004984" }}
          />
          Reviewed-or-deeper · {totalReviewed}
        </div>
      </div>

      <div className="mt-3">
        <AreaChart series={buckets} />
      </div>

      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        {ticks.map((t) => (
          <span
            key={t.at.toISOString()}
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {formatTickDate(t.at, granularity)}
          </span>
        ))}
      </div>
    </div>
  );
}
