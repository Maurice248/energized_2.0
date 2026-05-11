import { notFound, redirect } from "next/navigation";
import { api } from "@/lib/trpc/server";
import { getSession } from "@/server/auth";
import { db } from "@/server/db";
import { and, eq } from "drizzle-orm";
import { user as userTable } from "@/server/db/schema/auth";
import { trainingEnrollments } from "@/server/db/schema";
import { isPlatinumEntitled } from "@/lib/billing-tiers";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { DetailClient } from "./detail-client";

export default async function TrainingDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getSession();
  if (session?.user?.role === "employer") {
    redirect("/candidates");
  }
  const data = await api.trainings.getBySlug({ slug }).catch(() => null);
  if (!data) notFound();

  let isPlatinum = false;
  let existingEnrollment: {
    id: string;
    status: string;
    progressJson: Record<string, { completedAt: string; score?: number }>;
  } | null = null;

  if (session) {
    const [u] = await db
      .select({
        plan: userTable.jobseekerPlan,
        status: userTable.jobseekerSubscriptionStatus,
      })
      .from(userTable)
      .where(eq(userTable.id, session.user.id))
      .limit(1);
    if (u) isPlatinum = isPlatinumEntitled({ plan: u.plan, status: u.status });

    const [enr] = await db
      .select({
        id: trainingEnrollments.id,
        status: trainingEnrollments.status,
        progressJson: trainingEnrollments.progressJson,
      })
      .from(trainingEnrollments)
      .where(
        and(
          eq(trainingEnrollments.candidateId, session.user.id),
          eq(trainingEnrollments.trainingId, data.training.id),
        ),
      )
      .limit(1);
    if (enr) existingEnrollment = enr;
  }

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
      <main className="flex-1 bg-slate-50 py-14">
        <div className="mx-auto max-w-6xl px-4">
          <DetailClient
            training={data.training}
            modules={data.modules}
            isPlatinum={isPlatinum}
            isSignedIn={!!session}
            existingEnrollment={existingEnrollment}
          />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
