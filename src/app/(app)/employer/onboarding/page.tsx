import { redirect } from "next/navigation";
import { getSession } from "@/server/auth";
import { EmployerOnboardingClient } from "./employer-onboarding-client";

export const metadata = { title: "Employer onboarding — Energized" };

export default async function EmployerOnboardingPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (session.user.role !== "employer") redirect("/");

  return (
    <EmployerOnboardingClient
      email={session.user.email}
      firstName={session.user.name?.split(" ")[0] ?? "there"}
    />
  );
}
