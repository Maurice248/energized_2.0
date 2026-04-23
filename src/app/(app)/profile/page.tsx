import { redirect } from "next/navigation";
import { getSession } from "@/server/auth";
import { db } from "@/server/db";
import { profiles } from "@/server/db/schema";
import { ProfileClient } from "./profile-client";

export const metadata = { title: "Your profile — Energized" };

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (session.user.role === "employer") redirect("/employer/profile");

  await db
    .insert(profiles)
    .values({ userId: session.user.id })
    .onConflictDoNothing({ target: profiles.userId });

  return (
    <ProfileClient
      name={session.user.name ?? ""}
      email={session.user.email}
      initialImage={session.user.image ?? null}
      role={(session.user as { role?: string }).role ?? "jobseeker"}
      emailVerified={Boolean(
        (session.user as { emailVerified?: boolean }).emailVerified,
      )}
      joinedAt={(session.user as { createdAt?: Date | string }).createdAt ?? null}
    />
  );
}
