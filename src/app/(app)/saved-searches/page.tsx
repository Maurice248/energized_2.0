import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getSession } from "@/server/auth";
import { createCaller } from "@/server/api/root";
import { createContext } from "@/server/api/trpc";
import { SiteHeader } from "@/components/marketing/site-header";
import { SavedSearchesClient } from "./saved-searches-client";

export const metadata: Metadata = { title: "Saved searches — Energized" };

export default async function SavedSearchesPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in?redirect=/saved-searches");

  const isEmployer = session.user.role === "employer";
  const api = createCaller(await createContext());

  const [jobsSearches, candidatesSearches] = await Promise.all([
    api.savedSearches.list({ surface: "jobs" }),
    isEmployer ? api.savedSearches.list({ surface: "candidates" }) : Promise.resolve([]),
  ]);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-4 py-8 md:py-10">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black md:text-3xl">Saved searches</h1>
            <p className="text-sm text-muted-foreground">
              Re-run a search in one click or remove ones you don&rsquo;t need.
            </p>
          </div>
          <Link
            href={isEmployer ? "/employer" : "/dashboard"}
            className="text-sm font-bold text-[var(--v2-accent)] hover:underline"
          >
            ← Back to dashboard
          </Link>
        </header>

        <SavedSearchesClient
          jobs={jobsSearches}
          candidates={candidatesSearches}
          isEmployer={isEmployer}
        />
      </main>
    </>
  );
}
