import { redirect } from "next/navigation";
import { and, eq, or } from "drizzle-orm";
import { getSession } from "@/server/auth";
import { db } from "@/server/db";
import { orgMembers } from "@/server/db/schema";
import { EmployerProfileClient } from "./employer-profile-client";

export const metadata = { title: "Company profile — Energized" };

export default async function EmployerProfilePage() {
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

  return <EmployerProfileClient email={session.user.email} />;
}
