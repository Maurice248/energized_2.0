import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

const fmtDate = (d: Date | string, opts?: Intl.DateTimeFormatOptions) =>
  new Date(d).toLocaleDateString("en-CA", opts ?? { month: "short", day: "numeric" });

type Attempt = {
  attemptId: string;
  status: string;
  score: number | null;
  questionCount: number;
  startedAt: Date | string;
  finishedAt: Date | string | null;
  slug: string;
  name: string;
  monogram: string;
  tileColor: string;
};

export function RecentAttemptsStrip({
  attempts,
  totalCount,
}: {
  attempts: Attempt[];
  totalCount: number;
}) {
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
          Your recent{" "}
          <em
            className="not-italic italic"
            style={{ color: "var(--brand-dark-blue, #004984)" }}
          >
            attempts
          </em>
          .
        </h2>
        <Link
          href="/skills/my-tests"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-700 hover:text-[var(--brand-dark-blue,#004984)]"
        >
          View all {totalCount} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {attempts.map((a) => (
          <AttemptCard key={a.attemptId} attempt={a} />
        ))}
      </div>
    </div>
  );
}

function AttemptCard({ attempt }: { attempt: Attempt }) {
  const passed =
    attempt.status === "passed" || attempt.status === "passed_top";
  const topVerified = attempt.status === "passed_top";
  const isInProgress = attempt.status === "in_progress";

  const href = isInProgress
    ? `/skills/${attempt.slug}/attempt/${attempt.attemptId}`
    : `/skills/${attempt.slug}/attempt/${attempt.attemptId}/result`;

  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-[var(--brand-black,#101820)] hover:shadow-md"
    >
      <div
        className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl text-sm font-bold text-white"
        style={{ background: attempt.tileColor }}
      >
        {attempt.monogram}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold text-slate-900">
            {attempt.name}
          </span>
          {topVerified && (
            <span
              className="grid h-3.5 w-3.5 flex-shrink-0 place-items-center rounded-full"
              style={{
                background: "var(--brand-blue, #1CAAE2)",
                color: "var(--brand-black, #101820)",
              }}
            >
              <Check className="h-2.5 w-2.5" strokeWidth={3} />
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-baseline gap-2 text-xs text-slate-500">
          {attempt.score !== null && (
            <span
              className="font-bold"
              style={{
                color: passed
                  ? "var(--brand-dark-blue, #004984)"
                  : "#94a3b8",
              }}
            >
              {attempt.score}/100
            </span>
          )}
          <span>
            {attempt.finishedAt ? fmtDate(attempt.finishedAt) : "In progress"}
          </span>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 flex-shrink-0 text-slate-400 transition group-hover:text-[var(--brand-blue,#1CAAE2)]" />
    </Link>
  );
}
