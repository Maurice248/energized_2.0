import { ArrowRight, Check } from "lucide-react";

type Cat = { cat: string; pct: number; right: number; total: number };

export function ResultSideCards({
  sectorName,
  sectorTileColor,
  currentRoleName,
  score,
  breakdown,
}: {
  sectorName: string;
  sectorTileColor: string;
  currentRoleName: string;
  score: number;
  breakdown: Cat[];
}) {
  const weakest = [...breakdown].sort((a, b) => a.pct - b.pct).slice(0, 3);
  const palette = ["#0369A1", "#4338CA", "#D97706"];
  return (
    <div className="grid gap-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-7">
        <h4 className="text-xl font-normal tracking-tight">Add to your profile</h4>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
          Recruiters filtering for {sectorName} can find verified candidates first.
        </p>
        <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
          <div className="flex items-center gap-3">
            <div
              className="grid h-11 w-11 place-items-center rounded-full text-sm font-bold text-white"
              style={{ background: sectorTileColor }}
            >
              You
            </div>
            <div>
              <div className="text-sm font-bold">Your profile</div>
              <div className="mt-0.5 text-xs text-slate-500">{currentRoleName}</div>
            </div>
          </div>
          <div className="mt-3.5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium">
            <span className="grid h-3.5 w-3.5 place-items-center rounded-full bg-[var(--brand-blue)] text-[var(--brand-black)]">
              <Check className="h-2.5 w-2.5" strokeWidth={3} />
            </span>
            Verified <em className="not-italic font-normal italic text-[var(--brand-dark-blue)]">{sectorName}</em> · {score}/100
          </div>
        </div>
      </div>

      {weakest.length > 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-7">
          <h4 className="text-xl font-normal tracking-tight">Recommended next</h4>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
            Areas to strengthen before your next attempt or role.
          </p>
          <div className="mt-4 grid gap-2.5">
            {weakest.map((c, i) => (
              <div
                key={c.cat}
                className="flex items-center gap-3 rounded-xl border border-slate-200 p-3.5"
              >
                <div
                  className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-md text-xs font-bold text-white"
                  style={{ background: palette[i % palette.length] }}
                >
                  {c.cat.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-slate-900">
                    {c.cat} — focused training
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {c.right}/{c.total} correct · trainings coming soon
                  </div>
                </div>
                <div className="grid h-7 w-7 place-items-center rounded-full bg-slate-100 text-slate-700">
                  <ArrowRight className="h-3 w-3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
