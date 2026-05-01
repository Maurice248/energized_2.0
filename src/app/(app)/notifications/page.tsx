import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getSession } from "@/server/auth";
import { createCaller } from "@/server/api/root";
import { createContext } from "@/server/api/trpc";
import { SiteHeader } from "@/components/marketing/site-header";
import { NotificationsList } from "./notifications-list";

export const metadata: Metadata = { title: "Notifications — Energized" };

export default async function NotificationsPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in?redirect=/notifications");

  const api = createCaller(await createContext());
  const items = await api.notifications.list({ limit: 50 });

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-4 py-8 md:py-10">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black md:text-3xl">Notifications</h1>
            <p className="text-sm text-muted-foreground">
              Last 50 updates across your applications and team.
            </p>
          </div>
          <Link
            href={
              session.user.role === "employer" ? "/employer" : "/dashboard"
            }
            className="text-sm font-bold text-[var(--v2-accent)] hover:underline"
          >
            ← Back to dashboard
          </Link>
        </header>

        <NotificationsList initial={items} />
      </main>
    </>
  );
}
