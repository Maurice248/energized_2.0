export function CatalogHero({
  total,
  isEmployer,
}: {
  total: number;
  isEmployer: boolean;
}) {
  return (
    <div className="grid gap-12 border-b border-slate-200 pb-12 lg:grid-cols-[1.4fr_1fr] lg:items-end">
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
          {isEmployer ? "Training catalog · talent depth" : "Training services · Platinum"}
        </div>
        <h1 className="mt-6 text-5xl font-bold leading-[0.95] tracking-tight md:text-6xl lg:text-7xl">
          {isEmployer ? (
            <>
              See the talent{" "}
              <em
                className="not-italic italic font-bold"
                style={{ color: "var(--brand-dark-blue, #004984)" }}
              >
                investing
              </em>{" "}
              in their skills.
            </>
          ) : (
            <>
              Skill up for the<br />
              roles that{" "}
              <em
                className="not-italic italic font-bold"
                style={{ color: "var(--brand-dark-blue, #004984)" }}
              >
                actually pay
              </em>
              .
            </>
          )}
        </h1>
        <p
          className="max-w-xl text-lg leading-relaxed text-slate-600"
          style={{ marginTop: 40 }}
        >
          {isEmployer
            ? `Energized candidates train across ${total}+ courses graded by working senior engineers. Certificates show on their profile — filter by badge to shortlist with confidence.`
            : `${total}+ courses graded by working senior engineers across Canadian energy. Self-paced. Earn certificates that sit on your profile — recruiters notice.`}
        </p>
      </div>
      <div className="grid gap-7">
        <Stat n={String(total)} l="Live courses across safety, technical, professional and transition tracks" />
        <Stat n="3.4×" l="More recruiter inbound for members with a verified badge" />
        {!isEmployer && (
          <Stat n="92%" l="First-attempt pass rate on partnered in-person practicals" />
        )}
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
