import Link from "next/link";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/api/root";
import { env } from "@/env";
import { Icon } from "@/components/shared/icon";
import { SectionCard } from "./section-card";
import { SystemHealth } from "./system-health";

export type AdminSystemOverview = inferRouterOutputs<AppRouter>["admin"]["system"]["list"];

function fmtSeen(d: Date | null): string {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const hrs = Math.floor(diff / (60 * 60 * 1000));
  if (hrs < 1) return `${Math.max(1, Math.floor(diff / 60_000))}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const LAST_STATUS_META: Record<
  string,
  { label: string; toneClass: "" | "is-warn" | "is-crit" }
> = {
  operational: { label: "Operational", toneClass: "" },
  degraded: { label: "Degraded", toneClass: "is-warn" },
  outage: { label: "Outage", toneClass: "is-crit" },
};

export function SystemPageView({ system }: { system: AdminSystemOverview }) {
  const degraded = system.services.filter((s) => s.tone === "warn" || s.tone === "crit");
  const stripeHot = Boolean(system.stripeDegradedSince);
  const headline =
    system.outageCount > 0
      ? `${system.outageCount} service outage${system.outageCount === 1 ? "" : "s"}`
      : system.degradedCount > 0
        ? `${system.degradedCount} degraded integration${system.degradedCount === 1 ? "" : "s"}`
        : stripeHot
          ? "Stripe webhook path degraded"
          : "Canadian energy labour platform nominal";

  return (
    <>
      <header className="v2-ahead" style={{ gridTemplateColumns: "1fr" }}>
        <div>
          <span className="v2-eyebrow">Platform reliability</span>
          <h1>
            System <em>health.</em>
          </h1>
          <p className="v2-ahead-sub" style={{ maxWidth: "none" }}>
            Synthetic probes roll up into the same service registry you see in Customer support — tuned for billing, authentication, outbound email, AI, and Postgres paths that anchor jobs, profiles, and applications across the sector.
          </p>
        </div>
      </header>

      <div className="v2-supp-metrics">
        <div className="v2-supp-metric">
          <span className="v2-supp-metric-k">Uptime blend · 30d</span>
          <span className="v2-supp-metric-v">{system.uptime30dPct.toFixed(2)}%</span>
          <span className="v2-supp-metric-meta">Rolling mean across wired dependency checks</span>
        </div>
        <div className="v2-supp-metric">
          <span className="v2-supp-metric-k">Probe latency · p95</span>
          <span className="v2-supp-metric-v">
            {system.p95LatencyMs != null ? `${system.p95LatencyMs}` : "—"}
            <span style={{ fontSize: 13, opacity: 0.75 }}>{system.p95LatencyMs != null ? " ms" : ""}</span>
          </span>
          <span className="v2-supp-metric-meta">{headline}</span>
        </div>
        <div className="v2-supp-metric">
          <span className="v2-supp-metric-k">Watched services</span>
          <span className="v2-supp-metric-v">{system.services.length}</span>
          <span className="v2-supp-metric-meta">
            {degraded.length > 0 ? (
              <>
                <strong>{degraded.length}</strong> not fully healthy
              </>
            ) : (
              "All probes reporting operational"
            )}
          </span>
        </div>
        <div className="v2-supp-metric v2-supp-metric-note">
          <span className="v2-supp-metric-k">App surface</span>
          <span className="v2-supp-metric-v" style={{ fontSize: 14, wordBreak: "break-all" }}>
            {env.NEXT_PUBLIC_APP_URL.replace(/^https?:\/\//i, "")}
          </span>
          <span className="v2-supp-metric-meta">
            Vercel deploy + Neon Postgres — probe origin matches this hostname.
          </span>
        </div>
      </div>

      {system.outageCount > 0 || stripeHot ? (
        <div
          className="v2-acard"
          style={{
            marginTop: 20,
            borderColor: system.outageCount > 0 ? "var(--v2-coral)" : "#eab308",
            background:
              system.outageCount > 0
                ? "linear-gradient(90deg, rgba(255,122,89,0.08), transparent)"
                : "linear-gradient(90deg, rgba(234,179,8,0.08), transparent)",
          }}
        >
          <div className="v2-acard-head" style={{ borderBottom: "none", paddingBottom: 0 }}>
            <h2 className="v2-acard-title" style={{ margin: 0 }}>
              Incident <em>signal.</em>
            </h2>
          </div>
          <p style={{ margin: 0, fontSize: 14, color: "var(--v2-ink-600)", maxWidth: 720 }}>
            {system.outageCount > 0
              ? "One or more dependencies are marked outage — customer flows may fail. Page on-call and prioritize restoring auth, Postgres, or payment confirmation paths."
              : stripeHot
                ? "Stripe webhooks remain reachable but degraded; subscription and invoice confirmations may lag. Cross-check Stripe status and webhook signing secrets before escalating."
                : null}
          </p>
          <Link
            href="/admin/support"
            className="v2-acard-link"
            style={{ marginTop: 12, display: "inline-flex" }}
          >
            Open support inbox <Icon name="chevronRight" size={12} />
          </Link>
        </div>
      ) : null}

      <div className="v2-agrid" style={{ marginTop: 8 }}>
        <div style={{ display: "grid", gap: 20 }}>
          <SectionCard
            title={
              <>
                Synthetic <em>probes.</em>
              </>
            }
            action={<span className="v2-supp-card-hint">~120s cadence · workers only</span>}
          >
            <div style={{ margin: 0 }}>
              <p className="v2-supp-aside-lede" style={{ marginTop: 0 }}>
                Background workers hit production-shaped endpoints — not marketing HTML — then write
                latencies into <code>system_services</code>. That keeps the Employer billing rail,
                candidate applications, verification queues, and email hand-offs visible from one
                place.
              </p>
              <ul className="v2-actv-list">
                <li className="v2-actv-item">
                  <span className="v2-actv-dot sky" />
                  <div>
                    <div className="v2-actv-text">
                      <strong>Latency &amp; status</strong> update with every probe; 30-day uptime is
                      derived from rolling daily OK/FAIL totals on each row.
                    </div>
                  </div>
                </li>
                <li className="v2-actv-item">
                  <span className="v2-actv-dot lilac" />
                  <div>
                    <div className="v2-actv-text">
                      <strong>Historical charts</strong> (latency sparklines &amp; outage windows)
                      ship in a future sprint alongside Vercel &amp; Trigger.dev run explorers.
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          </SectionCard>

          <SectionCard
            title={
              <>
                Energized <em>production stack.</em>
              </>
            }
            action={
              <Link href="/admin/pages" className="v2-acard-link">
                CMS pages <Icon name="chevronRight" size={12} />
              </Link>
            }
          >
            <p className="v2-supp-aside-lede" style={{ marginTop: 0 }}>
              The platform is optimised for specialised Canadian hiring — reservoirs to renewables —
              backed by audited infrastructure defaults.
            </p>
            <ul className="v2-actv-list">
              <li className="v2-actv-item">
                <span className="v2-actv-dot sky" />
                <div className="v2-actv-text">
                  <strong>Neon Postgres + Drizzle</strong> holds auth, profiles, jobs, trainings,
                  applications, CMS pages, billing state, and audit trails.
                </div>
              </li>
              <li className="v2-actv-item">
                <span className="v2-actv-dot lilac" />
                <div className="v2-actv-text">
                  <strong>Better Auth, Stripe, Resend, Blob, Trigger.dev, PostHog &amp; OpenAI</strong> plug
                  in through typed env — surfaced here when probes exist for those paths.
                </div>
              </li>
              <li className="v2-actv-item">
                <span className="v2-actv-dot" style={{ background: "var(--v2-accent)" }} />
                <div className="v2-actv-text">
                  <strong>Edge middleware</strong> protects App Router shells; heavier mutations stay
                  on Node runtimes aligned with Drizzle pooling guidance.
                </div>
              </li>
            </ul>
          </SectionCard>

          <SectionCard
            title={
              <>
                Dependency <em>catalogue.</em>
              </>
            }
            action={
              <Link href="/admin/" className="v2-acard-link">
                Back to overview <Icon name="chevronRight" size={12} />
              </Link>
            }
          >
            <p className="v2-supp-aside-lede" style={{ marginTop: 0 }}>
              Every row feeds both this page and Customer support contextual panels — keep names
              human-readable because employers read mirrors of these summaries during Sev-2 bridges.
            </p>
            {system.services.length === 0 ? (
              <div className="v2-mod-empty">
                No <code>system_services</code> rows yet — run DB seeds or inserts so probes have a
                registry to write against.
              </div>
            ) : (
              <ul className="v2-supp-svc-list">
                {system.services.map((s) => {
                  const statusKey =
                    s.tone === "crit" ? "outage" : s.tone === "warn" ? "degraded" : "operational";
                  const st = LAST_STATUS_META[statusKey] ?? {
                    label: statusKey,
                    toneClass: "" as const,
                  };
                  return (
                    <li key={s.slug} className="v2-supp-svc-row">
                      <div>
                        <div className="v2-supp-svc-name">{s.name}</div>
                        <div className="v2-supp-svc-meta">
                          <span className="v2-supp-svc-cat">{s.category}</span>
                          {s.ping !== "—" ? ` · ${s.ping}` : ""}
                          {s.lastCheckedAt ? ` · checked ${fmtSeen(s.lastCheckedAt)}` : ""}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span className={`v2-supp-svc-state${st.toneClass ? ` ${st.toneClass}` : ""}`}>
                          {st.label}
                        </span>
                        <div className="v2-supp-svc-up">
                          {s.uptimePct.toFixed(2)}% uptime (30d)
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>
        </div>

        <div style={{ display: "grid", gap: 20 }}>
          <SystemHealth
            services={system.services.map((s) => ({
              slug: s.slug,
              name: s.name,
              state: s.state,
              tone: s.tone,
              ping: s.ping,
              uptimePct: s.uptimePct,
            }))}
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
                Operator <em>shortcuts.</em>
              </>
            }
          >
            <p className="v2-supp-aside-lede" style={{ marginTop: 0 }}>
              Jumps mirrored from Platform nav — optimised for diagnosing hiring or billing fallout
              when a probe blips scarlet.
            </p>
            <ul className="v2-actv-list">
              <li className="v2-actv-item">
                <span className="v2-actv-dot sky" />
                <Link href="/admin/support" className="v2-acard-link">
                  Customer support inbox <Icon name="chevronRight" size={12} />
                </Link>
              </li>
              <li className="v2-actv-item">
                <span className="v2-actv-dot lilac" />
                <Link href="/admin/billing" className="v2-acard-link">
                  Billing &amp; plans <Icon name="chevronRight" size={12} />
                </Link>
              </li>
              <li className="v2-actv-item">
                <span className="v2-actv-dot" style={{ background: "var(--v2-accent)" }} />
                <Link href="/admin/audit" className="v2-acard-link">
                  Audit log <Icon name="chevronRight" size={12} />
                </Link>
              </li>
            </ul>
          </SectionCard>

          <SectionCard
            title={
              <>
                Runbook <em>notes.</em>
              </>
            }
          >
            <ul className="v2-actv-list">
              <li className="v2-actv-item">
                <span className="v2-actv-dot sky" />
                <div className="v2-actv-text">
                  When Postgres fails, stall job applications and banner employer dashboards until WAL
                  catch-up clears — prioritize read paths that hit candidate discovery.
                </div>
              </li>
              <li className="v2-actv-item">
                <span className="v2-actv-dot lilac" />
                <div className="v2-actv-text">
                  Email regressions cascade into verification backlog — reconcile Resend event logs
                  with <code>/admin/verifications</code> before retries fan out duplicates.
                </div>
              </li>
              <li className="v2-actv-item">
                <span className="v2-actv-dot" style={{ background: "var(--v2-coral)" }} />
                <div className="v2-actv-text">
                  Training catalogue purchases flow through Stripe + Trigger.dev — reconcile webhook
                  health here before blaming content delivery.
                </div>
              </li>
            </ul>
          </SectionCard>
        </div>
      </div>
    </>
  );
}
