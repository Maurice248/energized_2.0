import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { api } from "@/lib/trpc/server";

const fmtDate = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
import { getSession } from "@/server/auth";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";

export const metadata: Metadata = {
  title: "Your skill tests — Energized",
};

export default async function MyTestsPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in?redirect=/skills/my-tests");
  if (session.user.role === "employer") redirect("/candidates");

  const attempts = await api.skillTests.myAttempts();

  const passedCount = attempts.filter(
    (a) => a.status === "passed" || a.status === "passed_top",
  ).length;
  const failedCount = attempts.filter((a) => a.status === "failed").length;

  return (
    <div
      className="v2"
      style={{
        minHeight: "100vh",
        background: "var(--v2-ink-50)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <SiteHeader active="skill-tests" />
      <main className="flex-1 bg-slate-50 py-14 lg:py-20">
        <div className="mx-auto max-w-5xl px-4">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Your skill tests
              </div>
              <h1 className="mt-2 text-4xl font-bold tracking-tight md:text-5xl">
                Your test{" "}
                <em
                  className="not-italic italic"
                  style={{ color: "var(--brand-dark-blue, #004984)" }}
                >
                  history
                </em>
                .
              </h1>
              <p className="mt-3 max-w-xl text-base leading-relaxed text-slate-600">
                Every attempt you&apos;ve taken, ranked by date. Click any row to
                see the full breakdown.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-6 text-sm">
              <Stat label="Verified" value={passedCount} />
              <Stat label="Attempts" value={attempts.length} />
              {failedCount > 0 && <Stat label="Retakes due" value={failedCount} />}
            </div>
          </div>

          {attempts.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
              {attempts.map((a, i) => (
                <AttemptRow key={a.attemptId} attempt={a} isLast={i === attempts.length - 1} />
              ))}
            </div>
          )}

          <div className="mt-8 text-center">
            <Link
              href="/skills"
              className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white transition"
              style={{ background: "var(--brand-black, #101820)" }}
            >
              <Sparkles className="h-4 w-4" />
              Take another test
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div
        className="text-3xl font-bold leading-none tracking-tight"
        style={{ color: "var(--brand-dark-blue, #004984)" }}
      >
        {value}
      </div>
      <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
    </div>
  );
}

type AttemptItem = Awaited<
  ReturnType<typeof api.skillTests.myAttempts>
>[number];

function AttemptRow({
  attempt,
  isLast,
}: {
  attempt: AttemptItem;
  isLast: boolean;
}) {
  const passed =
    attempt.status === "passed" || attempt.status === "passed_top";
  const topVerified = attempt.status === "passed_top";
  const isInProgress = attempt.status === "in_progress";

  // In-progress / forfeited: link to runner (gets bounced) or back to configure.
  // Finished: link straight to result.
  const href = isInProgress
    ? `/skills/${attempt.slug}/attempt/${attempt.attemptId}`
    : `/skills/${attempt.slug}/attempt/${attempt.attemptId}/result`;

  return (
    <Link
      href={href}
      className={`group flex items-center gap-4 px-6 py-5 transition hover:bg-slate-50 ${
        isLast ? "" : "border-b border-slate-200"
      }`}
    >
      <div
        className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl text-sm font-bold text-white"
        style={{ background: attempt.tileColor }}
      >
        {attempt.monogram}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-base font-semibold text-slate-900">
            {attempt.name}
          </span>
          <StatusBadge status={attempt.status} topVerified={topVerified} />
        </div>
        <div className="mt-0.5 text-xs text-slate-500">
          {attempt.finishedAt
            ? `Finished ${fmtDate(attempt.finishedAt)}`
            : `Started ${fmtDate(attempt.startedAt)}`}{" "}
          · {attempt.questionCount} questions
        </div>
      </div>
      <div className="hidden items-baseline gap-1 sm:flex">
        {attempt.score !== null ? (
          <>
            <span
              className="text-2xl font-bold leading-none tracking-tight"
              style={{
                color: passed
                  ? "var(--brand-dark-blue, #004984)"
                  : "#94a3b8",
              }}
            >
              {attempt.score}
            </span>
            <span className="text-sm text-slate-400">/100</span>
          </>
        ) : (
          <span className="text-sm text-slate-400">—</span>
        )}
      </div>
      <div className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-500 transition group-hover:border-[var(--brand-blue,#1CAAE2)] group-hover:bg-[var(--brand-blue,#1CAAE2)] group-hover:text-[var(--brand-black,#101820)]">
        <ArrowRight className="h-4 w-4" />
      </div>
    </Link>
  );
}

function StatusBadge({
  status,
  topVerified,
}: {
  status: string;
  topVerified: boolean;
}) {
  if (status === "in_progress") {
    return (
      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-900">
        In progress
      </span>
    );
  }
  if (status === "passed_top") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
        style={{
          background: "var(--brand-blue, #1CAAE2)",
          color: "var(--brand-black, #101820)",
        }}
      >
        <Check className="h-2.5 w-2.5" strokeWidth={3} />
        Verified · Top 30%
      </span>
    );
  }
  if (status === "passed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700">
        <Check className="h-2.5 w-2.5" strokeWidth={3} />
        Verified
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-900">
        Did not pass
      </span>
    );
  }
  // forfeited
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
      Forfeited
    </span>
  );
  // unreachable but TS exhaustive
  void topVerified;
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
      <div
        className="mx-auto grid h-14 w-14 place-items-center rounded-full"
        style={{ background: "var(--brand-blue, #1CAAE2)" }}
      >
        <Sparkles className="h-6 w-6 text-[var(--brand-black,#101820)]" />
      </div>
      <h3 className="mt-5 text-2xl font-bold tracking-tight">
        No tests yet.
      </h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-600">
        Take your first sector-specific assessment. Pass and a verified badge
        lands on your public profile.
      </p>
      <Link
        href="/skills"
        className="mt-6 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white transition"
        style={{ background: "var(--brand-black, #101820)" }}
      >
        Browse tests <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
