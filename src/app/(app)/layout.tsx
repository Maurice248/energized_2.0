import { redirect } from "next/navigation";
import { getSession } from "@/server/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  return <div className="v2">{children}</div>;
}
