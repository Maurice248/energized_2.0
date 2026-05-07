import { redirect } from "next/navigation";
import { getSession } from "@/server/auth";
import { db } from "@/server/db";
import { profiles } from "@/server/db/schema";
import { SiteHeader } from "@/components/marketing/site-header";
import { syncJobseekerSubscriptionFromStripe } from "@/server/services/jobseeker-billing-sync";
import { ProfileClient } from "./profile-client";

export const metadata = { title: "Your profile — Energized" };

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ billing?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (session.user.role === "employer") redirect("/employer/profile");

  await db
    .insert(profiles)
    .values({ userId: session.user.id })
    .onConflictDoNothing({ target: profiles.userId });

  // After Stripe checkout success the webhook may not have arrived yet
  // (especially in dev without `stripe listen`). Pull the live subscription
  // from Stripe and write the same fields the webhook would, then strip the
  // ?billing=success param so a refresh doesn't re-sync.
  const sp = await searchParams;
  if (sp.billing === "success") {
    await syncJobseekerSubscriptionFromStripe(session.user.id);
    redirect("/profile#pp-billing");
  }

  return (
    <>
      <SiteHeader active="profile" />
      <ProfileClient
        userId={session.user.id}
        name={session.user.name ?? ""}
        email={session.user.email}
        initialImage={session.user.image ?? null}
        role={(session.user as { role?: string }).role ?? "jobseeker"}
        emailVerified={Boolean(
          (session.user as { emailVerified?: boolean }).emailVerified,
        )}
        joinedAt={(session.user as { createdAt?: Date | string }).createdAt ?? null}
      />
    </>
  );
}
