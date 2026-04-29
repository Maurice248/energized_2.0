import { api } from "@/lib/trpc/server";
import type { Range } from "@/lib/range";

function Stage({
  label,
  count,
  pctOfPrev,
  intensity,
  height,
}: {
  label: string;
  count: number;
  pctOfPrev: number | null;
  intensity: number;
  height: number;
}) {
  const opacity = (0.3 + intensity * 0.7).toFixed(2);
  return (
    <div className="flex flex-1 flex-col">
      <div className="relative h-32 rounded-md bg-muted">
        <div
          className="absolute bottom-0 left-0 right-0 rounded-md"
          style={{
            height: `${height}%`,
            background: `var(--v2-accent)`,
            opacity,
          }}
        />
      </div>
      <div className="mt-2 flex items-baseline justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
          <div className="text-xl font-black tabular-nums">{count}</div>
        </div>
        {pctOfPrev !== null && (
          <div className="text-xs font-bold text-muted-foreground">
            {pctOfPrev}%
          </div>
        )}
      </div>
    </div>
  );
}

export async function HiringFunnel({ range }: { range: Range }) {
  const data = await api.employer.getFunnel({ range });

  if (data.totalApplications === 0 && data.rejectedCount === 0) {
    return (
      <div className="rounded-xl border p-4">
        <div className="flex items-baseline justify-between">
          <div className="text-sm font-bold">Hiring funnel</div>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          No applications in this range — try widening the date range.
        </p>
      </div>
    );
  }

  const max = Math.max(...data.stages.map((s) => s.count), 1);

  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Hiring funnel
          </div>
          <div className="text-base font-bold">
            From <em className="not-italic font-black">applied</em> to{" "}
            <em className="not-italic font-black">offer</em>
          </div>
        </div>
        {data.rejectedCount > 0 && (
          <div className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
            Not selected: {data.rejectedCount}
          </div>
        )}
      </div>
      <div className="mt-4 flex items-end gap-3">
        {data.stages.map((s, i) => (
          <Stage
            key={s.key}
            label={s.label}
            count={s.count}
            pctOfPrev={s.pctOfPrev}
            intensity={1 - i * 0.2}
            height={Math.max((s.count / max) * 100, s.count > 0 ? 8 : 0)}
          />
        ))}
      </div>
    </div>
  );
}
