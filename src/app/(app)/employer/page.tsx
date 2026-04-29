import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { employerOrgs, orgMembers } from "@/server/db/schema";
import { getSession } from "@/server/auth";

export const metadata: Metadata = { title: "Dashboard — Energized" };

export default async function EmployerDashboardPage() {
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
        .where(eq(orgMembers.email, email))
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
        <Link
          href="/employer/jobs/new"
          className="inline-flex items-center rounded-md bg-[#1CAAE2] px-4 py-2 text-sm font-bold text-white hover:opacity-90"
        >
          + Post a job
        </Link>
      </header>

      {/* KPI strip — Task 8 replaces this */}
      <section className="mb-6">
        <div className="rounded-xl border p-4 text-sm text-muted-foreground">
          KPI strip placeholder
        </div>
      </section>

      {/* Inbox + Stale — Tasks 10 & 11 replace these */}
      <section className="mb-6 grid gap-4 md:grid-cols-2">
        <Suspense fallback={<SectionSkeleton title="Inbox" />}>
          <div className="rounded-xl border p-4 text-sm text-muted-foreground">
            Inbox queue placeholder
          </div>
        </Suspense>
        <Suspense fallback={<SectionSkeleton title="Alerts" />}>
          <div className="rounded-xl border p-4 text-sm text-muted-foreground">
            Stale alerts placeholder
          </div>
        </Suspense>
      </section>

      {/* Pipeline by job — Task 12 replaces this */}
      <section className="mb-6">
        <Suspense fallback={<SectionSkeleton title="Pipeline" />}>
          <div className="rounded-xl border p-4 text-sm text-muted-foreground">
            Pipeline by job placeholder
          </div>
        </Suspense>
      </section>

      {/* Plan + Activity — Tasks 9 & 13 replace these */}
      <section className="grid gap-4 md:grid-cols-2">
        <Suspense fallback={<SectionSkeleton title="Plan" />}>
          <div className="rounded-xl border p-4 text-sm text-muted-foreground">
            Plan & quota placeholder
          </div>
        </Suspense>
        <Suspense fallback={<SectionSkeleton title="Activity" />}>
          <div className="rounded-xl border p-4 text-sm text-muted-foreground">
            Recent activity placeholder
          </div>
        </Suspense>
      </section>
    </main>
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
