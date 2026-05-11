import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Check, PlayCircle } from "lucide-react";
import { api } from "@/lib/trpc/server";
import { getSession } from "@/server/auth";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";

export const metadata: Metadata = {
  title: "My trainings — Energized",
};

const fmtDate = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export default async function MyTrainingsPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in?redirect=/trainings/my-trainings");
  if (session.user.role === "employer") redirect("/candidates");

  const enrollments = await api.trainings.myEnrollments();

  const inProgress = enrollments.filter((e) => e.status === "in_progress");
  const enrolled = enrollments.filter((e) => e.status === "enrolled");
  const completed = enrollments.filter((e) => e.status === "completed");

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
      <SiteHeader active="trainings" />
      <main className="flex-1 bg-slate-50 py-14 lg:py-20">
        <div className="mx-auto max-w-5xl px-4">
          <div className="mb-10">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Your trainings
            </div>
            <h1 className="mt-2 text-4xl font-bold tracking-tight md:text-5xl">
              Your training{" "}
              <em
                className="not-italic italic"
                style={{ color: "var(--brand-dark-blue, #004984)" }}
              >
                progress
              </em>
              .
            </h1>
          </div>

          {enrollments.length === 0 && (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <h3 className="text-2xl font-bold tracking-tight">No trainings yet.</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-600">
                Browse the catalog and enroll in your first course.
              </p>
              <Link
                href="/trainings"
                className="mt-6 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white"
                style={{ background: "var(--brand-black, #101820)" }}
              >
                Browse trainings <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}

          {inProgress.length > 0 && (
            <Section title="In progress">
              {inProgress.map((e) => (
                <EnrollmentRow key={e.id} enrollment={e} cta="Continue" ctaIcon="play" />
              ))}
            </Section>
          )}

          {enrolled.length > 0 && (
            <Section title="Enrolled">
              {enrolled.map((e) => (
                <EnrollmentRow key={e.id} enrollment={e} cta="Start course" ctaIcon="arrow" />
              ))}
            </Section>
          )}

          {completed.length > 0 && (
            <Section title="Completed">
              {completed.map((e) => (
                <EnrollmentRow
                  key={e.id}
                  enrollment={e}
                  cta="View certificate"
                  ctaIcon="arrow"
                  isCompleted
                />
              ))}
            </Section>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
        {title}
      </div>
      <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white">
        {children}
      </div>
    </section>
  );
}

type EnrollmentSummary = Awaited<ReturnType<typeof api.trainings.myEnrollments>>[number];

function EnrollmentRow({
  enrollment,
  cta,
  ctaIcon,
  isCompleted = false,
}: {
  enrollment: EnrollmentSummary;
  cta: string;
  ctaIcon: "play" | "arrow";
  isCompleted?: boolean;
}) {
  const href = isCompleted
    ? `/trainings/${enrollment.trainingSlug}/certificate?enrollment=${enrollment.id}`
    : `/trainings/${enrollment.trainingSlug}`;
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 border-b border-slate-200 px-6 py-5 transition last:border-b-0 hover:bg-slate-50"
    >
      <div
        className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl text-sm font-bold text-white"
        style={{ background: enrollment.trainingTileColor ?? "#004984" }}
      >
        {enrollment.trainingMonogram}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-base font-bold text-slate-900">{enrollment.trainingTitle}</div>
        <div className="mt-0.5 text-xs text-slate-500">
          {enrollment.trainingDurationLabel}
          {enrollment.completedAt && ` · Completed ${fmtDate(enrollment.completedAt)}`}
          {enrollment.finalScore !== null && ` · Score ${enrollment.finalScore}/100`}
          {!isCompleted && enrollment.enrolledAt && ` · Enrolled ${fmtDate(enrollment.enrolledAt)}`}
        </div>
      </div>
      <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-700">
        {ctaIcon === "play" ? (
          <PlayCircle className="h-4 w-4" />
        ) : isCompleted ? (
          <Check className="h-4 w-4" />
        ) : null}
        {cta} <ArrowRight className="h-4 w-4" />
      </span>
    </Link>
  );
}
