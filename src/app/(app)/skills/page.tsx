import { api } from "@/lib/trpc/server";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { CatalogHero } from "./_components/catalog-hero";
import { SectorGrid } from "./_components/sector-grid";
import { PopularRoles } from "./_components/popular-roles";
import { HowItWorksStrip } from "./_components/how-it-works-strip";
import { RecentAttemptsStrip } from "./_components/recent-attempts-strip";

export default async function SkillsPage() {
  const [sectors, attempts] = await Promise.all([
    api.skillTests.listTopics(),
    api.skillTests.myAttempts().catch(() => []),
  ]);
  const recent = attempts.slice(0, 3);
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
      <SiteHeader active="skill-tests" />
      <main className="flex-1 bg-slate-50 py-14 lg:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <CatalogHero sectors={sectors} />
          {recent.length > 0 && (
            <section className="mt-12">
              <RecentAttemptsStrip
                attempts={recent}
                totalCount={attempts.length}
              />
            </section>
          )}
          <section className="mt-16">
            <SectorGrid sectors={sectors} />
          </section>
          <section className="mt-16">
            <PopularRoles sectors={sectors} />
          </section>
          <HowItWorksStrip />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
