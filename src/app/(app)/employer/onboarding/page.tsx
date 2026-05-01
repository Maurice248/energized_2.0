import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { orgMembers } from "@/server/db/schema";
import { getSession } from "@/server/auth";
import { EmployerOnboardingClient } from "./employer-onboarding-client";

export const metadata = { title: "Employer onboarding — Energized" };

export default async function EmployerOnboardingPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  // If the user already belongs to an org, they're past the onboarding
  // wizard — bounce them to the dashboard instead of re-running it.
  const userId = session.user.id;
  const email = session.user.email.toLowerCase();
  const [byUser] = await db
    .select({ orgId: orgMembers.orgId })
    .from(orgMembers)
    .where(eq(orgMembers.userId, userId))
    .limit(1);
  const existingOrgId =
    byUser?.orgId ??
    (
      await db
        .select({ orgId: orgMembers.orgId })
        .from(orgMembers)
        .where(
          and(eq(orgMembers.email, email), eq(orgMembers.status, "active")),
        )
        .limit(1)
    )[0]?.orgId ??
    null;
  if (existingOrgId) redirect("/employer");

  return (
    <EmployerOnboardingClient
      email={session.user.email}
      firstName={session.user.name?.split(" ")[0] ?? "there"}
    />
  );
}
