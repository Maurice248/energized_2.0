import { redirect } from "next/navigation";
import { getSession } from "@/server/auth";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // If a signed-in user lands on /sign-in, /sign-up, /forgot-password,
  // /reset-password, or /verify-email, send them to their role's home
  // instead of showing an auth form they don't need.
  const session = await getSession();
  if (session) {
    if (session.user.role === "employer") redirect("/employer");
    redirect("/dashboard");
  }
  return <div className="v2">{children}</div>;
}
