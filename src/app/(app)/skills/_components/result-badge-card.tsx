import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

export function ResultBadgeCard({
  score,
  passed,
  topVerified,
  correct,
  total,
  narrative,
  topicName,
}: {
  score: number;
  passed: boolean;
  topVerified: boolean;
  correct: number;
  total: number;
  narrative: string;
  topicName: string;
}) {
  const eyebrow = passed ? "Verified" : "Attempt complete";
  const headline = topVerified ? "Top 30%." : passed ? "You passed." : "Almost there.";
  const headlineEm = topVerified ? "Badge earned." : passed ? "Solid result." : "Try again in 7 days.";

  return (
    <div className="relative overflow-hidden rounded-3xl bg-[var(--brand-black)] p-12 text-white">
      <div className="pointer-events-none absolute -right-48 -top-48 h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(28,170,226,0.12),transparent_70%)]" />
      <div className="relative">
        <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--brand-blue)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-blue)]" />
          {eyebrow}
        </div>
        <h1
          className="mt-4 text-5xl font-bold leading-[0.95] tracking-tight md:text-7xl"
          style={{ color: "#fff" }}
        >
          {headline}{" "}
          <em
            className="not-italic italic"
            style={{ color: "var(--brand-blue, #1CAAE2)" }}
          >
            {headlineEm}
          </em>
        </h1>
        <div className="mt-7 flex items-baseline gap-3.5">
          <div className="text-9xl font-bold leading-none tracking-tight text-[var(--brand-blue)] md:text-[140px]">
            {score}
          </div>
          <div className="text-3xl font-bold text-slate-300 md:text-4xl">/100</div>
          <div className="ml-auto max-w-[140px] text-[11px] font-bold uppercase leading-relaxed tracking-[0.16em] text-slate-300">
            {correct} of {total} correct · {topicName}
          </div>
        </div>
        {narrative && (
          <p
            className="mt-7 max-w-xl text-base leading-relaxed"
            style={{ color: "rgba(255,255,255,0.85)" }}
          >
            {narrative}
          </p>
        )}
        <div className="mt-9 flex flex-wrap gap-2.5">
          {passed ? (
            <button
              className="inline-flex items-center gap-2 rounded-full px-5 py-3.5 text-sm font-bold transition"
              style={{
                background: "var(--brand-blue, #1CAAE2)",
                color: "var(--brand-black, #101820)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--brand-dark-blue, #004984)";
                e.currentTarget.style.color = "#fff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--brand-blue, #1CAAE2)";
                e.currentTarget.style.color = "var(--brand-black, #101820)";
              }}
            >
              <Check className="h-4 w-4" /> Badge added to your profile
            </button>
          ) : (
            <Link
              href="/skills"
              className="inline-flex items-center gap-2 rounded-full px-5 py-3.5 text-sm font-bold transition"
              style={{
                background: "var(--brand-blue, #1CAAE2)",
                color: "var(--brand-black, #101820)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--brand-dark-blue, #004984)";
                e.currentTarget.style.color = "#fff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--brand-blue, #1CAAE2)";
                e.currentTarget.style.color = "var(--brand-black, #101820)";
              }}
            >
              Take another <ArrowRight className="h-4 w-4" />
            </Link>
          )}
          <Link
            href="/skills"
            className="inline-flex items-center gap-2 rounded-full px-5 py-3.5 text-sm font-medium transition"
            style={{
              border: "1px solid rgba(255,255,255,0.25)",
              color: "#fff",
              background: "transparent",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--brand-blue, #1CAAE2)";
              e.currentTarget.style.color = "var(--brand-blue, #1CAAE2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
              e.currentTarget.style.color = "#fff";
            }}
          >
            <ArrowRight className="h-3.5 w-3.5" /> All sectors
          </Link>
        </div>
      </div>
    </div>
  );
}
