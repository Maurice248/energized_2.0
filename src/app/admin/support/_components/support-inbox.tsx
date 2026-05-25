import Link from "next/link";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/api/root";
import { Icon } from "@/components/shared/icon";
import { SectionCard } from "../../_components/section-card";

export type SupportInbox = inferRouterOutputs<AppRouter>["admin"]["support"]["inbox"];

function truncate(text: string | null | undefined, max: number): string {
  if (!text) return "";
  const t = text.trim();
  if (!t.length) return "";
  if (t.length <= max) return t;
  return `${t.slice(0, max).trim()}…`;
}

function ticketMeta(row: SupportInbox["tickets"][number]): string {
  const bits = [
    row.status.replace("_", " "),
    row.orgName,
    row.requesterName ?? row.requesterEmail ?? "",
    row.assigneeName ? `Assigned · ${row.assigneeName}` : null,
    fmtSeen(row.createdAt),
    row.closedAt ? `Closed ${fmtSeen(row.closedAt)}` : null,
    row.firstResponseAt ? `First reply ${fmtSeen(row.firstResponseAt)}` : null,
  ];
  return bits.filter(Boolean).join(" · ");
}

function fmtSeen(d: Date): string {
  const diff = Date.now() - new Date(d).getTime();
  const hrs = Math.floor(diff / (60 * 60 * 1000));
  if (hrs < 1) return `${Math.max(1, Math.floor(diff / 60_000))}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function fmtUtcMedium(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(d));
}

const INTRO_STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  declined: "Declined",
  canceled: "Canceled",
  expired: "Expired",
};

const SERVICE_STATE: Record<
  string,
  { label: string; tone: "" | "warn" | "crit" }
> = {
  operational: { label: "Operational", tone: "" },
  degraded: { label: "Degraded", tone: "warn" },
  outage: { label: "Outage", tone: "crit" },
};

export function SupportInboxView({ inbox }: { inbox: SupportInbox }) {
  const degradedServices = inbox.services.filter((s) => s.lastStatus !== "operational");

  return (
    <>
      <header className="v2-ahead">
        <div>
          <span className="v2-eyebrow">Customer success</span>
          <h1>
            Unified support <em>inbox.</em>
          </h1>
          <p className="v2-ahead-sub">
            Formal tickets, intro requests with candidate messages, and monitored services that
            underpin customer-facing flows — in one glance.
          </p>
        </div>
      </header>

      <div className="v2-supp-metrics">
        <div className="v2-supp-metric">
          <span className="v2-supp-metric-k">Open tickets</span>
          <span className="v2-supp-metric-v">{inbox.ticketTotals.open.toLocaleString()}</span>
          <span className="v2-supp-metric-meta">
            {inbox.ticketTotals.in_progress.toLocaleString()} in progress ·{" "}
            {inbox.ticketTotals.closed.toLocaleString()} closed ·{" "}
            {inbox.ticketTotals.all.toLocaleString()} total
          </span>
        </div>
        <div className="v2-supp-metric">
          <span className="v2-supp-metric-k">Intro inquiries</span>
          <span className="v2-supp-metric-v">{inbox.introTotals.pending.toLocaleString()}</span>
          <span className="v2-supp-metric-meta">
            {(
              inbox.introTotals.accepted +
              inbox.introTotals.declined +
              inbox.introTotals.canceled +
              inbox.introTotals.expired
            ).toLocaleString()}{" "}
            settled · {inbox.introInquiries.length.toLocaleString()} loaded
          </span>
        </div>
        <div className="v2-supp-metric">
          <span className="v2-supp-metric-k">Platform services</span>
          <span className="v2-supp-metric-v">{inbox.services.length.toLocaleString()}</span>
          <span className="v2-supp-metric-meta">
            {degradedServices.length > 0 ? (
              <>
                <strong>{degradedServices.length}</strong> not fully healthy
              </>
            ) : (
              "All services operational"
            )}
          </span>
        </div>
        <div className="v2-supp-metric v2-supp-metric-note">
          <span className="v2-supp-metric-k">Public contact form</span>
          <span className="v2-supp-metric-v" style={{ fontSize: 15, fontWeight: 700 }}>
            Email only
          </span>
          <span className="v2-supp-metric-meta">
            <code>/contact</code> sends to dev@energized.biz — not stored in the database yet.
          </span>
        </div>
      </div>

      <div className="v2-agrid" style={{ marginTop: 8 }}>
        <div style={{ display: "grid", gap: 20 }}>
          <SectionCard
            title={
              <>
                Support <em>tickets</em>
              </>
            }
            action={
              <span className="v2-supp-card-hint">
                Last {inbox.tickets.length} by priority &amp; recency
              </span>
            }
          >
            {inbox.tickets.length === 0 ? (
              <div className="v2-mod-empty">No support tickets in the database yet.</div>
            ) : (
              inbox.tickets.map((t) => (
                <div key={t.id} className="v2-ticket v2-ticket--detail">
                  <span className={`v2-ticket-id ${t.priority === "p1" ? "urgent" : ""}`}>
                    {t.code}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div className="v2-ticket-subj">{t.subject}</div>
                    <div className="v2-ticket-meta">{ticketMeta(t)}</div>
                    {t.body ? (
                      <p className="v2-ticket-msgpreview">{truncate(t.body, 360)}</p>
                    ) : (
                      <p className="v2-ticket-msgpreview v2-ticket-msgpreview--empty">
                        No initial message body on file.
                      </p>
                    )}
                  </div>
                  <div style={{ display: "grid", gap: 6, justifyItems: "end" }}>
                    <span
                      className={`v2-ticket-prio ${
                        t.priority === "p1" ? "p1" : t.priority === "p2" ? "p2" : "p3"
                      }`}
                    >
                      {t.priority.toUpperCase()}
                    </span>
                    <span className="v2-supp-pill">{t.status.replace("_", " ")}</span>
                  </div>
                </div>
              ))
            )}
          </SectionCard>

          <SectionCard
            title={
              <>
                Candidate &amp; employer <em>intro requests</em>
              </>
            }
            action={
              <span className="v2-supp-card-hint">
                Message the employer sent with each request
              </span>
            }
          >
            {inbox.introInquiries.length === 0 ? (
              <div className="v2-mod-empty">No intro inquiries yet.</div>
            ) : (
              inbox.introInquiries.map((r) => (
                <div key={r.id} className="v2-ticket v2-ticket--detail">
                  <span
                    className={`v2-ticket-id ${r.status === "pending" ? "urgent" : ""}`}
                    title={r.id}
                  >
                    {r.id.replace(/-/g, "").slice(0, 8).toUpperCase()}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div className="v2-ticket-subj">
                      {r.orgName ?? "Unknown org"}
                      {" · "}
                      {r.candidateName ?? r.candidateEmail ?? "Unknown candidate"}
                    </div>
                    <div className="v2-ticket-meta">
                      {INTRO_STATUS_LABEL[r.status] ?? r.status} · requested by{" "}
                      {r.requestedByName ?? "—"} · {fmtSeen(r.createdAt)} · expires{" "}
                      {fmtUtcMedium(r.expiresAt)} UTC
                    </div>
                    {r.message ? (
                      <p className="v2-ticket-msgpreview">{truncate(r.message, 420)}</p>
                    ) : (
                      <p className="v2-ticket-msgpreview v2-ticket-msgpreview--empty">
                        No cover message on this intro.
                      </p>
                    )}
                  </div>
                  <span className={`v2-supp-pill v2-supp-pill--${r.status}`}>
                    {INTRO_STATUS_LABEL[r.status] ?? r.status}
                  </span>
                </div>
              ))
            )}
          </SectionCard>
        </div>

        <div style={{ display: "grid", gap: 20 }}>
          <SectionCard
            title={
              <>
                Related <em>platform services</em>
              </>
            }
            action={
              <Link href="/admin" className="v2-acard-link">
                Overview <Icon name="chevronRight" size={12} />
              </Link>
            }
          >
            <p className="v2-supp-aside-lede">
              When customers report login, billing, or deliverability issues, cross-check these
              monitored dependencies first.
            </p>
            {inbox.services.length === 0 ? (
              <div className="v2-mod-empty">No system service rows configured.</div>
            ) : (
              <ul className="v2-supp-svc-list">
                {inbox.services.map((s) => {
                  const st = SERVICE_STATE[s.lastStatus] ?? {
                    label: s.lastStatus,
                    tone: "" as const,
                  };
                  return (
                    <li key={s.slug} className="v2-supp-svc-row">
                      <div>
                        <div className="v2-supp-svc-name">{s.name}</div>
                        <div className="v2-supp-svc-meta">
                          <span className="v2-supp-svc-cat">{s.category}</span>
                          {s.lastLatencyMs != null ? ` · ${s.lastLatencyMs} ms` : ""}
                          {s.lastCheckedAt ? ` · checked ${fmtSeen(s.lastCheckedAt)}` : ""}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span className={`v2-supp-svc-state${st.tone ? ` is-${st.tone}` : ""}`}>
                          {st.label}
                        </span>
                        <div className="v2-supp-svc-up">{s.uptimePct.toFixed(2)}% uptime (30d)</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>

          <SectionCard
            title={
              <>
                Inbox <em>signals</em>
              </>
            }
          >
            <ul className="v2-actv-list">
              <li className="v2-actv-item">
                <span className="v2-actv-dot sky" />
                <div>
                  <div className="v2-actv-text">
                    <strong>{inbox.introTotals.pending.toLocaleString()}</strong> intro requests still
                    awaiting candidate response.
                  </div>
                </div>
              </li>
              <li className="v2-actv-item">
                <span className="v2-actv-dot lilac" />
                <div>
                  <div className="v2-actv-text">
                    <strong>{inbox.ticketTotals.open + inbox.ticketTotals.in_progress}</strong>{" "}
                    tickets need staff attention (open + in progress).
                  </div>
                </div>
              </li>
              {degradedServices.length > 0 ? (
                <li className="v2-actv-item">
                  <span className="v2-actv-dot coral" />
                  <div>
                    <div className="v2-actv-text">
                      Degraded paths:{" "}
                      <strong>{degradedServices.map((s) => s.name).join(", ")}</strong>
                    </div>
                  </div>
                </li>
              ) : null}
            </ul>
          </SectionCard>
        </div>
      </div>
    </>
  );
}
