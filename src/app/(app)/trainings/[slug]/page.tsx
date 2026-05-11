import { notFound } from "next/navigation";
import { api } from "@/lib/trpc/server";
import { getSession } from "@/server/auth";
import { db } from "@/server/db";
import { eq } from "drizzle-orm";
import { user as userTable } from "@/server/db/schema/auth";
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
  const data = await api.trainings.getBySlug({ slug }).catch(() => null);
  if (!data) notFound();

  const session = await getSession();
  let isPlatinum = false;
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
          />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
