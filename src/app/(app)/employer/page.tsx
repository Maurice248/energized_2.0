import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { employerOrgs, orgMembers } from "@/server/db/schema";
import { getSession } from "@/server/auth";
import { isRange, type Range } from "@/lib/range";
import { SiteHeader } from "@/components/marketing/site-header";
import { KpiStrip } from "./_components/kpi-strip";
import { HiringFunnel } from "./_components/hiring-funnel";
import { PlanQuotaCard } from "./_components/plan-quota-card";
import { InboxQueue } from "./_components/inbox-queue";
import { StaleAlerts } from "./_components/stale-alerts";
import { ApplicationsChart } from "./_components/applications-chart";
import { PipelineByJob } from "./_components/pipeline-by-job";
import { RecentActivity } from "./_components/recent-activity";
import { RangePills } from "./_components/range-pills";

export const metadata: Metadata = { title: "Dashboard — Energized" };

export default async function EmployerDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const sp = await searchParams;
  const range: Range = isRange(sp.range) ? sp.range : "30d";

  const session = await getSession();
  if (!session) redirect("/sign-in?redirect=/employer");
  if (session.user.role !== "employer") redirect("/dashboard");

  // Resolve org via orgMembers (matches findMyOrg in the router)
  const userId = session.user.id;
  const email = session.user.email.toLowerCase();

  const [byUser] = await db
    .select({ orgId: orgMembers.orgId })
    .from(orgMembers)
    .where(eq(orgMembers.userId, userId))
    .limit(1);

  const orgId =
    byUser?.orgId ??
    (
      await db
        .select({ orgId: orgMembers.orgId })
        .from(orgMembers)
        .where(and(eq(orgMembers.email, email), eq(orgMembers.status, "active")))
        .limit(1)
    )[0]?.orgId ??
    null;

  if (!orgId) redirect("/employer/onboarding");

  const [org] = await db
    .select({ name: employerOrgs.name })
    .from(employerOrgs)
    .where(eq(employerOrgs.id, orgId))
    .limit(1);

  return (
    <>
      <SiteHeader active="dashboard" />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 md:py-10">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black md:text-3xl">
            Welcome back, {org?.name ?? "team"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Here&rsquo;s what needs your attention today.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <RangePills active={range} />
          <Link href="/employer/jobs/new" className="v2-btn v2-btn-accent">
            + Post a job
          </Link>
        </div>
      </header>

      <section className="mb-6">
        <KpiStrip range={range} />
      </section>

      <section className="mb-6">
        <HiringFunnel range={range} />
      </section>

      {/* Inbox + Stale — Tasks 10 & 11 replace these */}
      <section className="mb-6 grid gap-4 md:grid-cols-2">
        <Suspense fallback={<SectionSkeleton title="Inbox" />}>
          <InboxQueue />
        </Suspense>
        <Suspense fallback={<SectionSkeleton title="Alerts" />}>
          <StaleAlerts />
        </Suspense>
      </section>

      <section className="mb-6">
        <Suspense
          fallback={
            <div className="rounded-xl border p-4">
              <div className="mb-2 h-4 w-40 animate-pulse rounded bg-muted" />
              <div className="h-56 animate-pulse rounded bg-muted/60" />
            </div>
          }
        >
          <ApplicationsChart range={range} />
        </Suspense>
      </section>

      {/* Pipeline by job — Task 12 replaces this */}
      <section className="mb-6">
        <Suspense fallback={<SectionSkeleton title="Pipeline" />}>
          <PipelineByJob />
        </Suspense>
      </section>

      {/* Plan + Activity — Tasks 9 & 13 replace these */}
      <section className="grid gap-4 md:grid-cols-2">
        <Suspense fallback={<SectionSkeleton title="Plan" />}>
          <PlanQuotaCard />
        </Suspense>
        <Suspense fallback={<SectionSkeleton title="Activity" />}>
          <RecentActivity />
        </Suspense>
      </section>
    </main>
    </>
  );
}

function SectionSkeleton({ title }: { title: string }) {
  return (
    <div className="rounded-xl border p-4">
      <div className="mb-2 h-4 w-24 animate-pulse rounded bg-muted" />
      <div className="h-20 animate-pulse rounded bg-muted/60" />
      <span className="sr-only">Loading {title}</span>
    </div>
  );
}
