import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getSession } from "@/server/auth";
import { createCaller } from "@/server/api/root";
import { createContext } from "@/server/api/trpc";
import { SiteHeader } from "@/components/marketing/site-header";
import { ShortlistClient } from "./shortlist-client";

export const metadata: Metadata = { title: "Shortlist — Energized" };

export default async function ShortlistPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in?redirect=/shortlist");
  if (session.user.role !== "employer") redirect("/dashboard");

  const api = createCaller(await createContext());
  const items = await api.savedCandidates.list();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-4 py-8 md:py-10">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black md:text-3xl">Shortlist</h1>
            <p className="text-sm text-muted-foreground">
              {items.length === 0
                ? "Candidates your team saves from /candidates show up here."
                : `${items.length} candidate${items.length === 1 ? "" : "s"} saved by your team.`}
            </p>
          </div>
          <Link
            href="/candidates"
            className="text-sm font-bold text-[var(--v2-accent)] hover:underline"
          >
            ← Back to candidate search
          </Link>
        </header>

        <ShortlistClient initial={items} />
      </main>
    </>
  );
}
