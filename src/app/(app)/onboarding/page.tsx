import { redirect } from "next/navigation";
import { getSession } from "@/server/auth";
import { OnboardingClient } from "./onboarding-client";

export const metadata = { title: "Onboarding — Energized" };

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (session.user.role === "employer") redirect("/employer");
  if (session.user.role !== "jobseeker") redirect("/");

  const params = await searchParams;
  const retakeRaw = params.retake;
  const retake =
    (Array.isArray(retakeRaw) ? retakeRaw[0] : retakeRaw) === "1";

  // Already onboarded — skip the wizard unless the user explicitly asked to
  // retake it (Profile → "Restart wizard" passes ?retake=1).
  if (session.user.onboardedAt && !retake) redirect("/dashboard");

  return (
    <OnboardingClient
      email={session.user.email}
      firstName={session.user.name?.split(" ")[0] ?? "there"}
    />
  );
}
