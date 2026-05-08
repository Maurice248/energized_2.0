"use client";
import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";

const LEVELS = [
  { id: "entry", y: "0–1 yrs", n: "Entry" },
  { id: "junior", y: "1–3 yrs", n: "Junior" },
  { id: "mid", y: "3–7 yrs", n: "Mid" },
  { id: "senior", y: "7+ yrs", n: "Senior" },
] as const;

const QUESTION_OPTS = [10, 15, 20, 25, 30] as const;

type Props = {
  sector: { name: string; monogram: string; tileColor: string };
  roles: { slug: string; name: string; subDescription: string | null }[];
  initialRoleSlug: string;
  submitting: boolean;
  onSubmit: (v: {
    roleSlug: string;
    level: "entry" | "junior" | "mid" | "senior";
    questionCount: 10 | 15 | 20 | 25 | 30;
    includeScenarios: boolean;
    includeCalc: boolean;
  }) => void;
};

export function ConfigureForm({ sector, roles, initialRoleSlug, submitting, onSubmit }: Props) {
  const [roleSlug, setRoleSlug] = useState(initialRoleSlug);
  const [level, setLevel] = useState<"entry" | "junior" | "mid" | "senior">("mid");
  const [count, setCount] = useState<10 | 15 | 20 | 25 | 30>(15);
  const [scenarios, setScenarios] = useState(true);
  const [calc, setCalc] = useState(true);
  const [honor, setHonor] = useState(false);

  const selectedRole = useMemo(
    () => roles.find((r) => r.slug === roleSlug) ?? roles[0],
    [roles, roleSlug],
  );
  const timeMins = Math.round(count * 1.5);

  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_380px] lg:items-start">
      <div>
        <div className="mb-2 flex items-center gap-4">
          <div
            className="grid h-12 w-12 place-items-center rounded-2xl text-lg font-bold text-white"
            style={{ background: sector.tileColor }}
          >
            {sector.monogram}
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
              {sector.name}
            </div>
          </div>
        </div>
        <h1 className="text-5xl font-bold leading-[0.95] tracking-tight md:text-6xl lg:text-7xl">
          Tune the <em className="not-italic italic text-[var(--brand-dark-blue)]">test</em>.<br />
          We&apos;ll generate it next.
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 md:text-lg">
          Tests are AI-built per attempt — tuned to your role and level. No two attempts are identical.
          Pick what you want covered.
        </p>

        <Field label="Role" hint={`${roles.length} options`}>
          <div className="flex flex-wrap gap-2">
            {roles.map((r) => (
              <button
                key={r.slug}
                onClick={() => setRoleSlug(r.slug)}
                className={`rounded-full border px-4 py-2.5 text-sm transition ${
                  roleSlug === r.slug
                    ? "border-[var(--brand-black)] bg-[var(--brand-black)] text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-[var(--brand-black)]"
                }`}
              >
                {r.name}
              </button>
            ))}
          </div>
          {selectedRole?.subDescription && (
            <p className="mt-3 text-sm text-slate-500">{selectedRole.subDescription}</p>
          )}
        </Field>

        <Field label="Level">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {LEVELS.map((l) => (
              <button
                key={l.id}
                onClick={() => setLevel(l.id)}
                className={`rounded-2xl border p-4 text-left transition ${
                  level === l.id
                    ? "border-[var(--brand-blue)] bg-[var(--brand-blue)] text-[var(--brand-black)]"
                    : "border-slate-200 bg-white hover:border-[var(--brand-black)]"
                }`}
              >
                <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  {l.y}
                </div>
                <div className="mt-1 text-xl font-bold tracking-tight">{l.n}</div>
              </button>
            ))}
          </div>
        </Field>

        <Field label="Length">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-3.5 flex items-baseline justify-between">
              <div>
                <div className="text-3xl font-bold leading-none tracking-tight">
                  <em className="not-italic italic text-[var(--brand-dark-blue)]">{count}</em>{" "}
                  <span className="text-base">questions</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Est. time</div>
                <div className="text-sm text-slate-500">~{timeMins} min</div>
              </div>
            </div>
            <input
              type="range"
              min={10}
              max={30}
              step={5}
              value={count}
              onChange={(e) => setCount(Number(e.target.value) as 10 | 15 | 20 | 25 | 30)}
              className="w-full accent-[var(--brand-black)]"
            />
            <div className="mt-2 flex justify-between text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">
              {QUESTION_OPTS.map((q) => <span key={q}>{q}</span>)}
            </div>
          </div>
        </Field>

        <Field label="What to include">
          <Toggle on={scenarios} onChange={setScenarios} title="Scenario questions" sub="Situational reasoning, weighted higher." />
          <Toggle on={calc} onChange={setCalc} title="Calculations & data interpretation" sub="Numerical problems — sizing, capacity factor, vibration, decline curve." />
        </Field>
      </div>

      <aside className="sticky top-24 overflow-hidden rounded-3xl bg-[var(--brand-black)] p-7 text-white">
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(28,170,226,0.15),transparent_70%)]" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--brand-blue)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-blue)]" />
            Ready to build
          </div>
          <h4 className="mt-3.5 text-2xl font-bold tracking-tight">{selectedRole?.name}</h4>
          <dl className="mt-4 divide-y divide-white/10 text-sm">
            <Row l="Sector" v={sector.name} />
            <Row l="Level" v={level[0].toUpperCase() + level.slice(1)} />
            <Row l="Questions" v={String(count)} />
            <Row l="Time" v={`${timeMins} min`} />
            <Row l="Scenarios" v={scenarios ? "Included" : "Off"} />
            <Row l="Calc" v={calc ? "Included" : "Off"} />
          </dl>
          <label className="mt-5 flex items-start gap-2.5 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={honor}
              onChange={(e) => setHonor(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[var(--brand-blue)]"
            />
            I&apos;ll take this test on my own — no outside help, no AI assistance.
          </label>
          <button
            disabled={!honor || submitting}
            onClick={() =>
              onSubmit({
                roleSlug,
                level,
                questionCount: count,
                includeScenarios: scenarios,
                includeCalc: calc,
              })
            }
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--brand-blue)] px-4 py-4 text-sm font-bold text-[var(--brand-black)] transition hover:bg-[var(--brand-dark-blue)] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            {submitting ? "Generating…" : "Generate test"}
          </button>
          <p className="mt-3.5 text-center text-xs leading-relaxed text-slate-300">
            Each generation is fresh. You can re-take after 30 days on a pass, 7 days on a fail.
          </p>
        </div>
      </aside>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mt-10">
      <div className="mb-3.5 flex items-baseline justify-between">
        <h4 className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</h4>
        {hint && <span className="text-xs text-slate-400">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ on, onChange, title, sub }: { on: boolean; onChange: (v: boolean) => void; title: string; sub: string }) {
  return (
    <div className="mt-2 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 first:mt-0">
      <div>
        <div className="text-[15px] font-medium text-slate-900">{title}</div>
        <div className="mt-0.5 text-sm text-slate-500">{sub}</div>
      </div>
      <button
        onClick={() => onChange(!on)}
        className={`relative h-6 w-11 flex-shrink-0 rounded-full transition ${on ? "bg-[var(--brand-black)]" : "bg-slate-200"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${on ? "left-[22px]" : "left-0.5"}`}
        />
      </button>
    </div>
  );
}

function Row({ l, v }: { l: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between py-3.5">
      <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-300">{l}</dt>
      <dd className="max-w-[60%] text-right text-sm font-medium text-white">{v}</dd>
    </div>
  );
}
