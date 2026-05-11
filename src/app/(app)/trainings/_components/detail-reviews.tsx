import { Star } from "lucide-react";

const SEED_REVIEWS = [
  {
    name: "Devin H.",
    role: "Field Operator → Turbine Tech",
    rating: 5,
    when: "Apr 2026",
    body: "Walked into the GWO practical knowing what to expect. Passed the SCBA donning drill on the first attempt — the prep video was almost frame-for-frame what I did on the day.",
  },
  {
    name: "Sara K.",
    role: "EIT, AltaLink",
    rating: 5,
    when: "Mar 2026",
    body: "The P.Eng module that broke down protection coordination was the clearest I've seen anywhere. Office hours with Robert were worth the whole sign-up on their own.",
  },
  {
    name: "Anish P.",
    role: "Controls Engineer II",
    rating: 4,
    when: "Feb 2026",
    body: "Hands-on with the simulated ControlLogix was great. The structured-text section moved a bit fast for me — would've liked one more practice problem before the assessment.",
  },
];

export function DetailReviews() {
  return (
    <section className="mt-12">
      <h2 className="text-3xl font-bold tracking-tight">Member reviews</h2>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {SEED_REVIEWS.map((r, i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-200 bg-white p-5"
          >
            <div className="flex items-center gap-1">
              {Array.from({ length: r.rating }).map((_, j) => (
                <Star
                  key={j}
                  className="h-3.5 w-3.5"
                  style={{ fill: "#f59e0b", color: "#f59e0b" }}
                />
              ))}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">
              &ldquo;{r.body}&rdquo;
            </p>
            <div className="mt-4 text-xs text-slate-500">
              <span className="font-bold text-slate-700">{r.name}</span>
              {" · "}
              {r.role}
              {" · "}
              {r.when}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
