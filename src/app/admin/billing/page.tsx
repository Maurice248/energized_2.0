import Link from "next/link";
import { Suspense } from "react";
import { api } from "@/lib/trpc/server";
import { Icon } from "@/components/shared/icon";
import { KpiCard } from "../_components/kpi-card";
import { SectionCard } from "../_components/section-card";
import { RevenueChart } from "../_components/revenue-chart";
import { RevenueBreakdown } from "../_components/revenue-breakdown";
import { EmployersTable } from "../_components/employers-table";

export const metadata = { title: "Billing & plans · Admin · Energized" };

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

const PLAN_ROWS: { name: string; detail: string }[] = [
  {
    name: "Starter",
    detail: "Single hiring team, core job posts, and Canadian energy sector templates.",
  },
  {
    name: "Growth",
    detail: "Higher post limits, pipeline tools, and verified employer badge priority.",
  },
  {
    name: "Enterprise",
    detail: "Multi-location orgs, security review, and dedicated success for large programs.",
  },
  {
    name: "Boost credits",
    detail: "One-time highlights for critical roles in oil & gas, renewables, and utilities.",
  },
  {
    name: "Recruiter seats",
    detail: "Per-seat add-on for agencies and in-house teams running high-volume hiring.",
  },
];

export default function BillingPage() {
  return (
    <Suspense fallback={<BillingSkeleton />}>
      <BillingBody />
    </Suspense>
  );
}

async function BillingBody() {
  const [kpis, revenueSeries, revenueBreakdown, topEmployers] = await Promise.all([
    api.admin.overview.kpis(),
    api.admin.overview.revenueSeries({ months: 12 }),
    api.admin.overview.revenueBreakdown(),
    api.admin.overview.topEmployers({ plan: "all", limit: 10 }),
  ]);

  const mrrSpark = revenueSeries.map((p) => p.mrr);
  const newSpark = revenueSeries.map((p) => p.new);
  const churnSpark = revenueSeries.map((p) => p.churn);
  const latestMonth = revenueSeries.length > 0 ? revenueSeries[revenueSeries.length - 1] : null;

  const addonBucket = revenueBreakdown.find((b) => b.key === "addon");
  const addonCents = addonBucket?.cents ?? 0;

  const arpaCents =
    kpis.mrr.activeOrgs > 0 ? Math.round(kpis.mrr.cents / kpis.mrr.activeOrgs) : null;

  return (
    <>
      <header className="v2-ahead" style={{ gridTemplateColumns: "1fr auto" }}>
        <div>
          <span className="v2-eyebrow">Revenue</span>
          <h1>
            Billing & <em>plans</em>
          </h1>
          <p className="v2-ahead-sub" style={{ maxWidth: "none" }}>
            Employer subscriptions, boost credits, and recruiter seats for the Canadian energy hiring network. Reconcile Stripe with MRR snapshots, watch plan mix, and jump to organizations that need payment follow-up.
          </p>
        </div>
        <div className="v2-ahead-actions">
          <Link href="/admin" className="v2-btn v2-btn-sm v2-btn-ghost">
            <Icon name="chevronLeft" size={12} />
            Admin overview
          </Link>
          <a
            href="https://dashboard.stripe.com"
            target="_blank"
            rel="noopener noreferrer"
            className="v2-btn v2-btn-sm v2-btn-primary"
          >
            Stripe Dashboard
            <Icon name="chevronRight" size={12} />
          </a>
        </div>
      </header>

      <div className="v2-akpi-row v2-akpi-row--four">
        <KpiCard
          dark
          eyebrow="MRR · CAD"
          icon="dollar"
          value={<>{fmtCurrencyShort(kpis.mrr.cents)}</>}
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
              ? `${kpis.mrr.activeOrgs} org${kpis.mrr.activeOrgs === 1 ? "" : "s"} in roll-up`
              : "Awaiting first paid subscription"
          }
          spark={mrrSpark}
        />
        <KpiCard
          eyebrow="ARPA · hint"
          icon="users"
          value={arpaCents !== null ? fmtCurrencyShort(arpaCents) : "—"}
          delta={null}
          note="Approx. recurring revenue per org in snapshot"
        />
        <KpiCard
          eyebrow="Latest month · movement"
          icon="trendingUp"
          value={latestMonth ? `${latestMonth.new}` : "—"}
          unit={
            latestMonth
              ? ` new · ${latestMonth.churn} churn`
              : undefined
          }
          delta={null}
          note={latestMonth ? `Month label · ${latestMonth.d}` : "No snapshot history yet"}
        />
        <KpiCard
          eyebrow="Add-ons & overages"
          icon="zap"
          value={fmtCurrencyShort(addonCents)}
          delta={null}
          note="Boosts, seats, metered usage in latest snapshot"
        />
      </div>

      <div className="v2-agrid" style={{ marginTop: 20 }}>
        <div style={{ display: "grid", gap: 20 }}>
          <SectionCard
            title={
              <>
                Revenue <em>trend</em>
              </>
            }
            action={
              <Link href="/admin/organizations" className="v2-acard-link">
                Organizations <Icon name="chevronRight" size={12} />
              </Link>
            }
          >
            <div className="v2-achart-legend">
              <span className="v2-achart-leg">
                <span className="sw" style={{ background: "#1CAAE2" }} />
                MRR{" "}
                <em>
                  $
                  {kpis.mrr.cents > 0
                    ? Math.round(kpis.mrr.cents / 1000_00).toLocaleString()
                    : 0}
                  k
                </em>
              </span>
              <span className="v2-achart-leg">
                <span className="sw" style={{ background: "#0B7AB0" }} />
                New subs <em>{newSpark[newSpark.length - 1] ?? 0}</em>
              </span>
              <span className="v2-achart-leg">
                <span className="sw" style={{ background: "#FF7A59" }} />
                Churn <em>{churnSpark[churnSpark.length - 1] ?? 0}</em>
              </span>
            </div>
            <RevenueChart data={revenueSeries} />
          </SectionCard>

          <SectionCard
            title={
              <>
                Revenue <em>breakdown</em>
              </>
            }
          >
            <RevenueBreakdown buckets={revenueBreakdown} />
          </SectionCard>

          <SectionCard
            title={
              <>
                Energized <em>catalog</em>
              </>
            }
          >
            <p style={{ margin: "0 0 16px", fontSize: 14, color: "var(--v2-ink-500)", maxWidth: "62ch" }}>
              Three employer plans anchor the marketplace; credits and seats layer on for staffing
              firms and rotating-site programs. Stripe bills in CAD aligned with Neon snapshot
              fields.
            </p>
            <div className="v2-rev-list">
              {PLAN_ROWS.map((row) => (
                <div key={row.name} className="v2-rev-item">
                  <div className="v2-rev-l">
                    <span
                      style={{
                        display: "inline-block",
                        width: 10,
                        height: 10,
                        borderRadius: 3,
                        background: "var(--v2-accent-deep)",
                        marginRight: 8,
                        flexShrink: 0,
                      }}
                    />
                    <span>
                      <strong style={{ color: "var(--v2-ink-950)" }}>{row.name}</strong>
                      <span style={{ display: "block", marginTop: 4, fontSize: 13, color: "var(--v2-ink-500)" }}>
                        {row.detail}
                      </span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title={
              <>
                Top <em>payers</em>
              </>
            }
            action={
              <Link href="/admin/organizations" className="v2-acard-link">
                Directory <Icon name="chevronRight" size={12} />
              </Link>
            }
          >
            <EmployersTable rows={topEmployers} />
          </SectionCard>
        </div>

        <aside className="v2-arail">
          <SectionCard
            title={
              <>
                Plan <em>mix</em>
              </>
            }
          >
            <div className="v2-rev-list">
              <div className="v2-rev-item">
                <div className="v2-rev-l">Enterprise</div>
                <div className="v2-rev-r">{kpis.employers.enterprise} orgs</div>
              </div>
              <div className="v2-rev-item">
                <div className="v2-rev-l">Growth</div>
                <div className="v2-rev-r">{kpis.employers.growth} orgs</div>
              </div>
              <div className="v2-rev-item">
                <div className="v2-rev-l">New employers · 7d</div>
                <div className="v2-rev-r">{kpis.employers.new7d}</div>
              </div>
              <div className="v2-rev-item">
                <div className="v2-rev-l">Verified live jobs</div>
                <div className="v2-rev-r">{kpis.jobs.verifiedPct.toFixed(0)}%</div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title={
              <>
                Billing <em>ops</em>
              </>
            }
          >
            <ul
              style={{
                margin: 0,
                paddingLeft: 18,
                fontSize: 14,
                lineHeight: 1.55,
                color: "var(--v2-ink-600)",
              }}
            >
              <li>Daily revenue snapshot · 00:05 UTC feeds MRR and plan buckets.</li>
              <li>Cross-check Stripe customer currency (CAD) before enterprise contracts.</li>
              <li>Past-due subscriptions surface as “At cap” on org rows until resolved.</li>
              <li>Grandfather manually in Stripe; annotate in audit when overrides apply.</li>
            </ul>
          </SectionCard>
        </aside>
      </div>
    </>
  );
}

function BillingSkeleton() {
  return (
    <>
      <div className="v2-ahead" aria-hidden>
        <div style={{ height: 120, opacity: 0.45, borderRadius: 12 }} />
      </div>
      <div className="v2-akpi-row v2-akpi-row--four" aria-hidden>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="v2-akpi" style={{ height: 180, opacity: 0.45 }} />
        ))}
      </div>
      <div className="v2-agrid" style={{ marginTop: 20 }} aria-hidden>
        <div className="v2-acard" style={{ height: 420, opacity: 0.45 }} />
        <div className="v2-acard" style={{ height: 220, opacity: 0.45 }} />
      </div>
    </>
  );
}
