import Link from "next/link";
import { Suspense } from "react";
import { getSession } from "@/server/auth";
import { api } from "@/lib/trpc/server";
import { Icon } from "@/components/shared/icon";
import { AdminOverviewHeader, firstNameFromSession } from "./_components/admin-overview-header";
import { KpiCard } from "./_components/kpi-card";
import { SectionCard } from "./_components/section-card";
import { RevenueChart } from "./_components/revenue-chart";
import { EmployersTable } from "./_components/employers-table";
import { GeoList } from "./_components/geo-list";
import { TopPages } from "./_components/top-pages";
import { RevenueBreakdown } from "./_components/revenue-breakdown";
import { SystemHealth } from "./_components/system-health";
import { ActivityFeed } from "./_components/activity-feed";

export const dynamic = "force-dynamic";

function fmtCurrencyShort(cents: number): string {
  if (cents === 0) return "$0";
  if (cents >= 1_000_000) return `$${(cents / 100_000_000).toFixed(2)}M`;
  if (cents >= 100_000) return `$${(cents / 100_000).toFixed(1)}k`;
  return `$${(cents / 100).toLocaleString()}`;
}

function deltaTone(value: number | null): "pos" | "neg" | "flat" {
  if (value === null || Math.abs(value) < 0.01) return "flat";
  return value >= 0 ? "pos" : "neg";
}

function deltaLabel(value: number | null, unit = "%"): string {
  if (value === null) return "—";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}${unit}`;
}

export default function AdminPage() {
  return (
    <Suspense fallback={<OverviewSkeleton />}>
      <OverviewBody />
    </Suspense>
  );
}

async function OverviewBody() {
  const session = await getSession();

  // Avoid firing ~12 DB round-trips at once: alongside admin layout’s parallel
  // calls, that spikes Neon WebSocket usage and can trigger "socket hang up".
  const [
    kpis,
    revenueSeries,
    revenueBreakdown,
    employers,
    geo,
    topPages,
  ] = await Promise.all([
    api.admin.overview.kpis(),
    api.admin.overview.revenueSeries({ months: 12 }),
    api.admin.overview.revenueBreakdown(),
    api.admin.overview.topEmployers({ plan: "all", limit: 7 }),
    api.admin.overview.geo(),
    api.admin.overview.topPages(),
  ]);

  const [activity, system] = await Promise.all([
    api.admin.overview.activity(),
    api.admin.system.list(),
  ]);

  const displayName = firstNameFromSession(session?.user.name, session?.user.email ?? "");

  const mrrSpark = revenueSeries.map((p) => p.mrr);
  const newSpark = revenueSeries.map((p) => p.new);
  const churnSpark = revenueSeries.map((p) => p.churn);

  return (
    <>
      <AdminOverviewHeader
        displayName={displayName}
        stripeDegradedSince={system.stripeDegradedSince}
      />

      <div className="v2-akpi-row">
        <KpiCard
          dark
          eyebrow="MRR · CAD"
          icon="dollar"
          value={
            <>
              {fmtCurrencyShort(kpis.mrr.cents).replace("$", "$")}
            </>
          }
          delta={
            kpis.mrr.deltaPct !== null
              ? {
                  tone: deltaTone(kpis.mrr.deltaPct),
                  label: deltaLabel(kpis.mrr.deltaPct),
                }
              : null
          }
          note={
            kpis.mrr.activeOrgs
              ? `${kpis.mrr.activeOrgs} active org${kpis.mrr.activeOrgs === 1 ? "" : "s"}`
              : "Awaiting first paid subscription"
          }
          spark={mrrSpark}
        />
        <KpiCard
          eyebrow="Users · total"
          icon="users"
          value={kpis.users.total.toLocaleString()}
          delta={
            kpis.users.new30d
              ? {
                  tone: "pos",
                  label: `+${kpis.users.new30d.toLocaleString()}`,
                }
              : { tone: "flat", label: "+0" }
          }
          note={`${kpis.users.candidatePct.toFixed(0)}% candidates · ${kpis.users.employerPct.toFixed(0)}% employers`}
        />
        <KpiCard
          eyebrow="Active employers"
          icon="building"
          value={kpis.employers.active.toLocaleString()}
          delta={
            kpis.employers.new7d
              ? { tone: "pos", label: `+${kpis.employers.new7d} this wk` }
              : { tone: "flat", label: "+0 this wk" }
          }
          note={`${kpis.employers.enterprise} ent · ${kpis.employers.growth} growth`}
        />
        <KpiCard
          eyebrow="Live jobs"
          icon="briefcase"
          value={kpis.jobs.live.toLocaleString()}
          delta={
            kpis.jobs.new7d
              ? { tone: "pos", label: `+${kpis.jobs.new7d} this wk` }
              : { tone: "flat", label: "+0 this wk" }
          }
          note={`${kpis.jobs.verifiedPct.toFixed(0)}% verified employers`}
        />
        <KpiCard
          eyebrow="AI match avg"
          icon="sparkles"
          value={
            <>
              {kpis.ai.avgScore !== null ? kpis.ai.avgScore.toFixed(0) : "—"}
              <span className="unit"> </span>
            </>
          }
          unit=""
          delta={
            kpis.ai.deltaPp !== null
              ? {
                  tone: deltaTone(kpis.ai.deltaPp),
                  label: `${kpis.ai.deltaPp >= 0 ? "+" : ""}${kpis.ai.deltaPp.toFixed(1)} pts`,
                }
              : null
          }
          note={`${kpis.ai.placementsYtd} placements YTD`}
        />
      </div>

      <div className="v2-agrid">
        <div style={{ display: "grid", gap: 20 }}>
          <SectionCard
            title={
              <>
                Revenue <em>trend</em>
              </>
            }
            action={
              <Link
                href="/admin/billing"
                className="v2-acard-link"
              >
                Billing dashboard <Icon name="chevronRight" size={12} />
              </Link>
            }
          >
            <div className="v2-achart-legend">
              <span className="v2-achart-leg">
                <span
                  className="sw"
                  style={{ background: "#1CAAE2" }}
                />
                MRR <em>${kpis.mrr.cents > 0 ? Math.round(kpis.mrr.cents / 1000_00).toLocaleString() : 0}k</em>
              </span>
              <span className="v2-achart-leg">
                <span className="sw" style={{ background: "#0B7AB0" }} />
                New subs · 30d <em>{newSpark[newSpark.length - 1] ?? 0}</em>
              </span>
              <span className="v2-achart-leg">
                <span className="sw" style={{ background: "#FF7A59" }} />
                Churn · 30d <em>{churnSpark[churnSpark.length - 1] ?? 0}</em>
              </span>
            </div>
            <RevenueChart data={revenueSeries} />
          </SectionCard>

          <SectionCard
            title={
              <>
                Top <em>organizations</em>
              </>
            }
            action={
              <Link href="/admin/organizations" className="v2-acard-link">
                All organizations <Icon name="chevronRight" size={12} />
              </Link>
            }
          >
            <EmployersTable rows={employers} />
          </SectionCard>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 20,
            }}
          >
            <SectionCard
              title={
                <>
                  Where users <em>are</em>
                </>
              }
            >
              <GeoList rows={geo} />
            </SectionCard>
            <SectionCard
              title={
                <>
                  Top <em>pages</em>
                </>
              }
            >
              <TopPages pages={topPages} />
            </SectionCard>
          </div>

          <SectionCard
            title={
              <>
                Revenue <em>breakdown</em>
              </>
            }
          >
            <RevenueBreakdown buckets={revenueBreakdown} />
          </SectionCard>
        </div>

        <aside className="v2-arail">
          <SystemHealth
            services={system.services}
            uptime30dPct={system.uptime30dPct}
            p95LatencyMs={system.p95LatencyMs}
            totalActive={system.totalActive}
            operationalCount={system.operationalCount}
            degradedCount={system.degradedCount}
            outageCount={system.outageCount}
            stripeDegradedSince={system.stripeDegradedSince}
          />

          <SectionCard
            title={
              <>
                Activity <em>feed</em>
              </>
            }
            action={
              <Link href="/admin/audit" className="v2-acard-link">
                Audit log <Icon name="chevronRight" size={12} />
              </Link>
            }
          >
            <ActivityFeed entries={activity} />
          </SectionCard>
        </aside>
      </div>
    </>
  );
}

function OverviewSkeleton() {
  return (
    <div className="v2-akpi-row" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="v2-akpi"
          style={{ height: 180, opacity: 0.5 }}
        />
      ))}
    </div>
  );
}
