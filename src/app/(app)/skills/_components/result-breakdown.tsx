type Cat = { cat: string; pct: number; right: number; total: number };

export function ResultBreakdown({ breakdown }: { breakdown: Cat[] }) {
  if (breakdown.length === 0) return null;
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8">
      <h3 className="text-2xl font-normal tracking-tight">Where you scored, by category</h3>
      <div className="mt-5 grid gap-5">
        {breakdown.map((c) => {
          const weak = c.pct < 60;
          return (
            <div key={c.cat} className="grid gap-1.5">
              <div className="flex items-baseline justify-between text-sm">
                <div className="font-medium text-slate-700">{c.cat}</div>
                <div className="text-xl font-normal tracking-tight">
                  <em className="not-italic italic text-[var(--brand-dark-blue)]">{c.pct}%</em>
                  <span className="ml-1.5 text-sm text-slate-400">
                    {c.right}/{c.total}
                  </span>
                </div>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full transition-[width] duration-1000"
                  style={{
                    width: `${c.pct}%`,
                    background: weak
                      ? "linear-gradient(90deg, #B45309, #F59E0B)"
                      : "linear-gradient(90deg, var(--brand-dark-blue), var(--brand-blue))",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
