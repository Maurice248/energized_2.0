import { api } from "@/lib/trpc/server";
import type { Range } from "@/lib/range";

const OPACITY_STEPS = [1.0, 0.8, 0.6, 0.4, 0.25, 0.15, 0.1];

export async function RolesByFamily({ range }: { range: Range }) {
  const rows = await api.employer.getApplicantsBySector({ range });

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border p-4">
        <div className="text-sm font-bold">By family</div>
        <p className="mt-2 text-sm text-muted-foreground">
          No applications to break down.
        </p>
      </div>
    );
  }

  const max = Math.max(...rows.map((r) => r.count), 1);

  return (
    <div className="rounded-xl border p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        By family
      </div>
      <div className="text-base font-bold">
        Applicants <em className="not-italic font-black">by sector</em>
      </div>
      <ul className="mt-3 space-y-3">
        {rows.map((r, i) => (
          <li key={r.sector}>
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-bold">{r.label}</span>
              <span className="tabular-nums text-muted-foreground">
                <strong className="text-foreground">{r.count}</strong> · {r.pct}%
              </span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full"
                style={{
                  width: `${(r.count / max) * 100}%`,
                  background: "var(--v2-accent)",
                  opacity: OPACITY_STEPS[Math.min(i, OPACITY_STEPS.length - 1)],
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
