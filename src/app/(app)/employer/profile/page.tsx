import { redirect } from "next/navigation";
import { and, eq, or } from "drizzle-orm";
import { getSession } from "@/server/auth";
import { db } from "@/server/db";
import { orgMembers } from "@/server/db/schema";
import { SiteHeader } from "@/components/marketing/site-header";
import { syncSubscriptionFromStripe } from "@/server/services/billing-sync";
import { EmployerProfileClient } from "./employer-profile-client";

export const metadata = { title: "Company profile — Energized" };

export default async function EmployerProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ billing?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const [membership] = await db
    .select({ orgId: orgMembers.orgId })
    .from(orgMembers)
    .where(
      or(
        eq(orgMembers.userId, session.user.id),
        and(
          eq(orgMembers.email, session.user.email.toLowerCase()),
          eq(orgMembers.status, "active"),
        ),
      ),
    )
    .limit(1);

  if (!membership) redirect("/employer/onboarding");

  // After Stripe checkout success, the webhook may not have arrived yet
  // (especially in dev without `stripe listen`). Pull the live subscription
  // from Stripe and write the same fields the webhook would, then strip the
  // ?billing=success param so a refresh doesn't re-sync.
  const sp = await searchParams;
  if (sp.billing === "success") {
    await syncSubscriptionFromStripe(membership.orgId);
    redirect("/employer/profile#ep-billing");
  }

  return (
    <>
      <SiteHeader active="dashboard" />
      <EmployerProfileClient email={session.user.email} />
    </>
  );
}
