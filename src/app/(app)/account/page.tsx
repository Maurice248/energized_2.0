import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getSession } from "@/server/auth";
import { SiteHeader } from "@/components/marketing/site-header";
import { AccountClient } from "./account-client";

export const metadata: Metadata = { title: "Account — Energized" };

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in?redirect=/account");

  const isEmployer = session.user.role === "employer";

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl px-4 py-8 md:py-10">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black md:text-3xl">Account</h1>
            <p className="text-sm text-muted-foreground">
              Your personal sign-in credentials. Each team member manages their
              own.
            </p>
          </div>
          <Link
            href={isEmployer ? "/employer" : "/dashboard"}
            className="text-sm font-bold text-[var(--v2-accent)] hover:underline"
          >
            ← Back to dashboard
          </Link>
        </header>

        <AccountClient
          email={session.user.email}
          name={session.user.name ?? ""}
        />
      </main>
    </>
  );
}
