import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { orgMembers } from "@/server/db/schema";
import { getSession } from "@/server/auth";
import { IntroRequestsClient } from "./intro-requests-client";

export const dynamic = "force-dynamic";

export default async function IntroRequestsPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in?redirect=/employer/intro-requests");

  const [member] = await db
    .select({ orgId: orgMembers.orgId })
    .from(orgMembers)
    .where(
      and(
        eq(orgMembers.userId, session.user.id),
        eq(orgMembers.status, "active"),
      ),
    )
    .limit(1);
  if (!member) redirect("/employer/onboarding");

  return <IntroRequestsClient />;
}
