"use client";
import { Sparkles } from "lucide-react";

type T = {
  title: string;
  longBlurb: string;
  monogram: string;
  tileColor: string;
  durationLabel: string;
  level: string;
  certName: string | null;
  instructorName: string;
  instructorRole: string;
  outcomesJson: string[];
};

export function DetailHero({
  training,
  moduleCount,
  lessonCount,
  onEnroll,
  ctaLabel,
  ctaDisabled,
}: {
  training: T;
  moduleCount: number;
  lessonCount: number;
  onEnroll: () => void;
  ctaLabel: string;
  ctaDisabled: boolean;
}) {
  return (
    <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr] lg:items-start">
      <div>
        <div className="flex items-center gap-3">
          <div
            className="grid h-12 w-12 place-items-center rounded-2xl text-lg font-bold text-white"
            style={{ background: training.tileColor }}
          >
            {training.monogram}
          </div>
          {training.certName && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-700">
              {training.certName}
            </span>
          )}
        </div>
        <h1 className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight md:text-5xl">
          {training.title}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600 md:text-lg">
          {training.longBlurb}
        </p>
        <div className="mt-8">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
            What you&apos;ll be able to do
          </h3>
          <ul className="mt-3 grid gap-2">
            {training.outcomesJson.map((o, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                <span
                  className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full"
                  style={{ background: "var(--brand-blue, #1CAAE2)" }}
                />
                {o}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <aside
        className="sticky top-24 overflow-hidden rounded-3xl p-7"
        style={{ background: "var(--brand-black, #101820)", color: "#fff" }}
      >
        <div
          className="text-[11px] font-bold uppercase tracking-[0.16em]"
          style={{ color: "var(--brand-blue, #1CAAE2)" }}
        >
          Course at a glance
        </div>
        <h4
          className="mt-3 text-2xl font-bold tracking-tight"
          style={{ color: "#fff" }}
        >
          {training.durationLabel}
        </h4>
        <dl className="mt-4 divide-y divide-white/10 text-sm">
          <Row
            l="Level"
            v={training.level[0].toUpperCase() + training.level.slice(1)}
          />
          <Row l="Modules" v={String(moduleCount)} />
          <Row l="Lessons" v={String(lessonCount)} />
          <Row l="Instructor" v={training.instructorName} />
        </dl>
        <p
          className="mt-3 text-xs leading-relaxed"
          style={{ color: "rgba(255,255,255,0.7)" }}
        >
          {training.instructorRole}
        </p>
        <button
          disabled={ctaDisabled}
          onClick={onEnroll}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            padding: "14px 16px",
            background: "var(--brand-blue, #1CAAE2)",
            color: "var(--brand-black, #101820)",
          }}
        >
          <Sparkles className="h-4 w-4" />
          {ctaLabel}
        </button>
      </aside>
    </div>
  );
}

function Row({ l, v }: { l: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between py-3">
      <dt
        className="text-[11px] font-bold uppercase tracking-[0.12em]"
        style={{ color: "rgba(255,255,255,0.7)" }}
      >
        {l}
      </dt>
      <dd className="text-sm font-medium" style={{ color: "#fff" }}>
        {v}
      </dd>
    </div>
  );
}
