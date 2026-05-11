import type { Metadata } from "next";
import { api } from "@/lib/trpc/server";
import { getSession } from "@/server/auth";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { CatalogHero } from "./_components/catalog-hero";
import { FeaturedStrip } from "./_components/featured-strip";
import { CatalogClient } from "./_components/catalog-client";

export const metadata: Metadata = {
  title: "Trainings — Energized",
};

export default async function TrainingsPage() {
  const session = await getSession();
  const isEmployer = session?.user?.role === "employer";
  const all = await api.trainings.list({ sort: "popular" });
  const featured = all.filter((t) => t.isFeatured).slice(0, 3);

  return (
    <div
      className="v2"
      style={{
        minHeight: "100vh",
        background: "var(--v2-ink-50)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <SiteHeader active="trainings" />
      <main className="flex-1 bg-slate-50 py-14 lg:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <CatalogHero total={all.length} isEmployer={isEmployer} />
          {featured.length > 0 && (
            <section className="mt-12">
              <FeaturedStrip trainings={featured} isEmployer={isEmployer} />
            </section>
          )}
          <section className="mt-12">
            <CatalogClient initialTrainings={all} isEmployer={isEmployer} />
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
