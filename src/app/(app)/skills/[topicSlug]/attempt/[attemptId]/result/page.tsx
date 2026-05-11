import { notFound, redirect } from "next/navigation";
import { api } from "@/lib/trpc/server";
import { getSession } from "@/server/auth";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { ResultBadgeCard } from "@/app/(app)/skills/_components/result-badge-card";
import { ResultBreakdown } from "@/app/(app)/skills/_components/result-breakdown";
import { ResultSideCards } from "@/app/(app)/skills/_components/result-side-cards";
import { ResultTelemetry } from "./result-telemetry";

export default async function ResultPage({
  params,
}: {
  params: Promise<{ topicSlug: string; attemptId: string }>;
}) {
  const { topicSlug, attemptId } = await params;
  const session = await getSession();
  if (session?.user?.role === "employer") {
    redirect(`/candidates?badges=${encodeURIComponent(topicSlug)}`);
  }
  const attempt = await api.skillTests.getAttempt({ attemptId }).catch(() => null);
  if (!attempt) notFound();
  if (attempt.status === "in_progress") notFound();

  const topic = await api.skillTests.getTopic({ slug: topicSlug });

  const score = attempt.score ?? 0;
  const passed = attempt.status === "passed" || attempt.status === "passed_top";
  const topVerified = attempt.status === "passed_top";

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
      <ResultTelemetry topicSlug={topicSlug} score={score} status={attempt.status} />
      <main className="flex-1 bg-slate-50 py-14">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
            <ResultBadgeCard
              score={score}
              passed={passed}
              topVerified={topVerified}
              correct={attempt.correctCount ?? 0}
              total={attempt.questionsJson.length}
              narrative={attempt.aiFeedback ?? ""}
              topicName={topic.sector.name}
            />
            <ResultSideCards
              sectorName={topic.sector.name}
              sectorTileColor={topic.sector.tileColor}
              currentRoleName={topic.currentRole?.name ?? topic.sector.name}
              score={score}
              passed={passed}
              breakdown={attempt.categoryBreakdown ?? []}
            />
          </div>
          <div className="mt-6">
            <ResultBreakdown breakdown={attempt.categoryBreakdown ?? []} />
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
