import { redirect } from "next/navigation";
import { getSession } from "@/server/auth";
import { OnboardingClient } from "./onboarding-client";

export const metadata = { title: "Onboarding — Energized" };

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (session.user.role === "employer") redirect("/employer");
  if (session.user.role !== "jobseeker") redirect("/");
  // Already onboarded — don't show the wizard again.
  if (session.user.onboardedAt) redirect("/dashboard");

  return (
    <OnboardingClient
      email={session.user.email}
      firstName={session.user.name?.split(" ")[0] ?? "there"}
    />
  );
}
