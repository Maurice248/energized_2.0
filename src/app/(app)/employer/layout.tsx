import { redirect } from "next/navigation";
import { getSession } from "@/server/auth";

// Layout-level gate for the entire /employer/* subtree. Anyone not
// authenticated lands on /sign-in; anyone whose role is not "employer"
// lands on /dashboard (their jobseeker home). Individual pages can
// keep their own org-membership checks below this — that's still the
// right place for "employer without an org" → /employer/onboarding.
export default async function EmployerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/sign-in?redirect=/employer");
  if (session.user.role !== "employer") redirect("/dashboard");
  return <>{children}</>;
}
