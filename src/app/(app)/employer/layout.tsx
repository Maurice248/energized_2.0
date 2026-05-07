import { redirect } from "next/navigation";
import { getSession } from "@/server/auth";

// Layout-level auth gate for /employer/*. Anyone not signed in lands on
// /sign-in.
//
// We DON'T check role here. A fresh employer signup is `role: "jobseeker"`
// (DB default) until OnboardingPersister fires on /employer/onboarding and
// the completeOnboarding mutation flips it. Gating role at the layout
// would intercept that flow and bounce them to /dashboard before the
// wizard ever ran. Each /employer/* page does its own org-membership
// check (and redirects role-mismatched users to /dashboard or
// /employer/onboarding as appropriate).
export default async function EmployerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/sign-in?redirect=/employer");
  return <>{children}</>;
}
