import { api } from "@/lib/trpc/server";
import { CatalogHero } from "./_components/catalog-hero";
import { SectorGrid } from "./_components/sector-grid";
import { PopularRoles } from "./_components/popular-roles";
import { HowItWorksStrip } from "./_components/how-it-works-strip";

export default async function SkillsPage() {
  const sectors = await api.skillTests.listTopics();
  return (
    <div className="min-h-[calc(100vh-76px)] bg-slate-50 py-14 lg:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <CatalogHero sectors={sectors} />
        <section className="mt-16">
          <SectorGrid sectors={sectors} />
        </section>
        <section className="mt-16">
          <PopularRoles sectors={sectors} />
        </section>
        <HowItWorksStrip />
      </div>
    </div>
  );
}
