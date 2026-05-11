export function CatalogHero({ total }: { total: number }) {
  return (
    <div className="grid gap-12 border-b border-slate-200 pb-12 lg:grid-cols-[1.4fr_1fr] lg:items-end">
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
          Training services · Platinum
        </div>
        <h1 className="mt-6 text-5xl font-bold leading-[0.95] tracking-tight md:text-6xl lg:text-7xl">
          Skill up for the<br />
          roles that{" "}
          <em
            className="not-italic italic font-bold"
            style={{ color: "var(--brand-dark-blue, #004984)" }}
          >
            actually pay
          </em>
          .
        </h1>
        <p className="mt-10 max-w-xl text-lg leading-relaxed text-slate-600">
          {total}+ courses graded by working senior engineers across Canadian
          energy. Self-paced. Earn certificates that sit on your profile —
          recruiters notice.
        </p>
      </div>
      <div className="grid gap-7">
        <Stat n={String(total)} l="Live courses across safety, technical, professional and transition tracks" />
        <Stat n="3.4×" l="More recruiter inbound for members with a verified badge" />
        <Stat n="92%" l="First-attempt pass rate on partnered in-person practicals" />
      </div>
    </div>
  );
}

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <div>
      <div
        className="text-4xl font-bold italic tracking-tight"
        style={{ color: "var(--brand-dark-blue, #004984)" }}
      >
        {n}
      </div>
      <div className="mt-2 max-w-[280px] text-[11px] font-bold uppercase leading-relaxed tracking-[0.16em] text-slate-500">
        {l}
      </div>
    </div>
  );
}
