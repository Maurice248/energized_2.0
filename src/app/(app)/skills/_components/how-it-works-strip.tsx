const STEPS = [
  { n: "01", h: "Pick a sector & role", p: "Choose what you want verified. Each test is targeted to the work, not generic IQ." },
  { n: "02", h: "AI builds the test", p: "Questions tuned to your level — multiple choice, scenarios, calcs. Fresh every attempt." },
  { n: "03", h: "Take it. ~25 min.", p: "One sitting, no second tries within a month. Tab-close = forfeited attempt." },
  { n: "04", h: "Get a verified badge", p: "Pass at 70 — Top-30% (80+) earns a verified tag. Recruiters can filter by it." },
];

export function HowItWorksStrip() {
  return (
    <div className="mt-20 grid gap-8 rounded-3xl border border-slate-200 bg-white p-11 sm:grid-cols-2 lg:grid-cols-4">
      {STEPS.map((s) => (
        <div key={s.n}>
          <div className="text-5xl font-black leading-none tracking-tight text-[var(--brand-dark-blue)]">
            {s.n}
          </div>
          <h4 className="mt-3 text-xl font-black tracking-tight">{s.h}</h4>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{s.p}</p>
        </div>
      ))}
    </div>
  );
}
