export function DetailUnlocks({
  unlocks,
}: {
  unlocks: { role: string; co: string; band: string }[];
}) {
  if (unlocks.length === 0) return null;
  return (
    <section className="mt-12">
      <h2 className="text-3xl font-bold tracking-tight">
        What this{" "}
        <em
          className="not-italic italic"
          style={{ color: "var(--brand-dark-blue, #004984)" }}
        >
          unlocks
        </em>
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        Recent roles where this credential is in the listing.
      </p>
      <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {unlocks.map((u, i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-200 bg-white p-5"
          >
            <div className="text-base font-bold text-slate-900">{u.role}</div>
            {u.co && (
              <div className="mt-1 text-xs text-slate-500">{u.co}</div>
            )}
            {u.band && (
              <div
                className="mt-3 text-lg font-bold tracking-tight"
                style={{ color: "var(--brand-dark-blue, #004984)" }}
              >
                {u.band}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
