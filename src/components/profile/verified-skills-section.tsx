import { Check } from "lucide-react";

type Badge = {
  topicId: string;
  slug: string;
  name: string;
  monogram: string;
  tileColor: string;
  score: number;
  isVerifiedTop: boolean;
  earnedAt: Date | string;
};

function formatEarnedAt(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export function VerifiedSkillsSection({ badges }: { badges: Badge[] }) {
  if (badges.length === 0) return null;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-xl font-black tracking-tight">Verified skills</h3>
        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
          {badges.length} {badges.length === 1 ? "badge" : "badges"}
        </span>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {badges.map((b) => (
          <div
            key={b.topicId}
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
          >
            <div
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-sm font-bold text-white"
              style={{ background: b.tileColor }}
            >
              {b.monogram}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold">{b.name}</span>
                {b.isVerifiedTop && (
                  <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-[var(--brand-blue)] text-[var(--brand-black)]">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500">
                {b.score}/100 · earned {formatEarnedAt(b.earnedAt)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
