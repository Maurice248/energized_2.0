import Link from "next/link";
import { Suspense } from "react";
import type Stripe from "stripe";
import { api } from "@/lib/trpc/server";
import { Icon } from "@/components/shared/icon";
import { KpiCard } from "../_components/kpi-card";
import { SectionCard } from "../_components/section-card";

export const metadata = { title: "Invoices · Admin · Energized" };

export const dynamic = "force-dynamic";

function fmtMoney(cents: number, currency: string): string {
  const code = currency.toUpperCase() === "USD" ? "USD" : currency.toUpperCase();
  try {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: code === "CAD" ? "CAD" : code === "USD" ? "USD" : code.length === 3 ? code : "CAD",
      maximumFractionDigits: 2,
    }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${code}`;
  }
}

function fmtInvoiceDate(d: Date): string {
  return d.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusPresentation(status: Stripe.Invoice.Status): {
  cls: "" | "warn" | "crit" | "idle";
  label: string;
} {
  switch (status) {
    case "paid":
      return { cls: "", label: "Paid" };
    case "open":
      return { cls: "warn", label: "Open" };
    case "uncollectible":
      return { cls: "crit", label: "Uncollectible" };
    case "draft":
      return { cls: "idle", label: "Draft" };
    case "void":
      return { cls: "idle", label: "Void" };
    default:
      return { cls: "idle", label: status };
  }
}

export default function InvoicesPage() {
  return (
    <Suspense fallback={<InvoicesSkeleton />}>
      <InvoicesBody />
    </Suspense>
  );
}

async function InvoicesBody() {
  const [pack, attention] = await Promise.all([
    api.admin.invoices.list({ limit: 48 }),
    api.admin.invoices.attentionCount(),
  ]);

  const { stripeEnabled, loadError, invoices, rollup } = pack;
  const attentionDisplay = attention >= 99 ? "99+" : String(attention);

  return (
    <>
      <header className="v2-ahead" style={{ gridTemplateColumns: "1fr auto" }}>
        <div>
          <span className="v2-eyebrow">Revenue</span>
          <h1>
            Stripe <em>invoices.</em>
          </h1>
          <p className="v2-ahead-sub" style={{ maxWidth: "none" }}>
            Employer subscriptions, recruiter seat add-ons, boost credits for featured oil & gas and renewables roles, and Candidate Pro renewals—all billed in Stripe (CAD-first). Pair this ledger with{" "}
            <Link href="/admin/billing" className="underline decoration-[var(--v2-ink-300)] underline-offset-[3px] hover:decoration-[var(--v2-accent-deep)]">
              Billing &amp; plans
            </Link>{" "}
            for net-new MRR; use hosted invoice links below for dunning and PDF exports.
          </p>
        </div>
        <div className="v2-ahead-actions">
          <Link href="/admin/billing" className="v2-btn v2-btn-sm v2-btn-ghost">
            <Icon name="chevronLeft" size={12} />
            Billing &amp; plans
          </Link>
          <a
            href="https://dashboard.stripe.com/invoices"
            target="_blank"
            rel="noopener noreferrer"
            className="v2-btn v2-btn-sm v2-btn-primary"
          >
            Stripe invoices
            <Icon name="chevronRight" size={12} />
          </a>
        </div>
      </header>

      {!stripeEnabled ? (
        <div style={{ marginTop: 20 }}>
          <SectionCard title={<>Stripe is <em>disabled.</em></>}>
            <p style={{ margin: "0 0 16px", fontSize: 14, color: "var(--v2-ink-600)", maxWidth: "72ch" }}>
              This environment does not have <code style={{ fontSize: "13px" }}>STRIPE_SECRET_KEY</code>{" "}
              configured. In production, invoices for Energized employer plans, training purchases, and
              candidate upgrades appear here once Checkout or Billing emits them.
            </p>
            <p
              style={{
                margin: "0 0 10px",
                fontSize: 12,
                fontFamily: "var(--v2-font-mono)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "var(--v2-ink-500)",
              }}
            >
              Before go-live
            </p>
            <ul className="v2-actv-list">
              <li className="v2-actv-item">
                <span className="v2-actv-dot sky" />
                <div className="v2-actv-text">
                  Confirm Stripe webhook secrets in Vercel so subscription and invoice lifecycle events settle
                  before Customer Support escalates billing tickets.
                </div>
              </li>
              <li className="v2-actv-item">
                <span className="v2-actv-dot lilac" />
                <div className="v2-actv-text">
                  Cross-reference organizations—paid employers should show a Stripe customer id after their
                  first successful checkout.
                </div>
              </li>
            </ul>
          </SectionCard>
        </div>
      ) : null}

      {stripeEnabled && loadError ? (
        <div
          className="v2-acard"
          style={{
            marginTop: 20,
            borderColor: "#eab308",
            background: "linear-gradient(90deg, rgba(234,179,8,0.08), transparent)",
          }}
        >
          <div className="v2-acard-head" style={{ borderBottom: "none", paddingBottom: 8 }}>
            <h2 className="v2-acard-title" style={{ margin: 0 }}>
              Could not sync <em>Stripe.</em>
            </h2>
          </div>
          <p style={{ margin: 0, fontSize: 14, color: "var(--v2-ink-600)", maxWidth: "72ch" }}>
            <code>{loadError}</code>
          </p>
        </div>
      ) : null}

      {stripeEnabled && !loadError ? (
        <>
          <div className="v2-akpi-row v2-akpi-row--four">
            <KpiCard
              eyebrow="Collections queue"
              icon="clock"
              value={attentionDisplay}
              delta={null}
              note={
                attention > 0
                  ? "Open + uncollectible invoices (Stripe, first 100 pages each)"
                  : "No unpaid invoice rows in Stripe right now."
              }
            />
            <KpiCard
              eyebrow="Open · in ledger view"
              icon="dollar"
              value={rollup.openInView > 0 ? fmtMoney(rollup.outstandingDueCents, "cad") : "—"}
              delta={null}
              note={
                rollup.openInView > 0
                  ? `${rollup.openInView} open invoice${rollup.openInView === 1 ? "" : "s"} · CAD display if mixed currencies, verify totals in Stripe`
                  : "No open rows in this invoice fetch"
              }
            />
            <KpiCard
              dark
              eyebrow="Paid · rolling 30 days"
              icon="checkCircle"
              value={rollup.paidLast30dCount}
              delta={null}
              note={
                rollup.paidLast30dCount > 0
                  ? `${fmtMoney(rollup.paidLast30dCents, "cad")} billed in-window (CAD rollup; audit in Stripe if multi-currency)`
                  : "No settled invoices dated in-window in this slice"
              }
            />
            <KpiCard
              eyebrow="Synced rows"
              icon="fileText"
              value={invoices.length}
              delta={null}
              note="Most recent Stripe invoice objects (DESC). Adjust limit in router if needed."
            />
          </div>

          <div className="v2-agrid" style={{ marginTop: 20 }}>
            <div style={{ display: "grid", gap: 20 }}>
              <SectionCard
                title={
                  <>
                    Energized <em>customers.</em>
                  </>
                }
                action={
                  <Link href="/admin/organizations" className="v2-acard-link">
                    Organizations <Icon name="chevronRight" size={12} />
                  </Link>
                }
              >
                <p
                  style={{
                    margin: "0 0 16px",
                    fontSize: 14,
                    color: "var(--v2-ink-500)",
                    maxWidth: "68ch",
                  }}
                >
                  Rows join Neon <code style={{ fontSize: "13px" }}>employer_orgs.stripe_customer_id</code>
                  {" · "}
                  and candidate Pro seats on{" "}
                  <code style={{ fontSize: "13px" }}>user.jobseeker_stripe_customer_id</code>.
                  Anything still anonymous on Energized is inferred from Stripe customer metadata —
                  onboarding may still be completing.
                </p>
              </SectionCard>

              <SectionCard
                title={
                  <>
                    Ledger <em>lines.</em>
                  </>
                }
              >
                {invoices.length === 0 ? (
                  <div className="v2-tbl-empty">
                    Stripe returned no invoices yet. Typical once the first employer checkout or training
                    purchase completes—or use test clocks in Stripe to simulate recurring cycles.
                  </div>
                ) : (
                  <div className="v2-tbl v2-tbl--invoices">
                    <div className="v2-tbl-th">
                      <span>Invoice</span>
                      <span>Billed party · Energized</span>
                      <span style={{ justifySelf: "center" }}>Status</span>
                      <span style={{ textAlign: "right" }}>Total</span>
                      <span>Due</span>
                      <span />
                    </div>
                    {invoices.map((inv) => {
                      const hosted = inv.hostedInvoiceUrl;
                      const pdf = inv.invoicePdf;
                      const dash = `https://dashboard.stripe.com/invoices/${inv.id}`;
                      const ext = hosted ?? dash;
                      const st = statusPresentation(inv.status);

                      let amountCents =
                        inv.status === "paid" ? inv.amountPaid : inv.amountDue !== 0 ? inv.amountDue : inv.total;

                      if (amountCents <= 0 && inv.total > 0) amountCents = inv.total;

                      return (
                        <div
                          key={inv.id}
                          className="v2-tbl-row v2-tbl-row--plain v2-inv-row"
                          style={{ cursor: "default" }}
                        >
                          <div className="v2-inv-invoice-hit">
                            <a
                              href={ext}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="v2-inv-host"
                            >
                              <Icon name="fileText" size={16} aria-hidden />
                              <span>
                                <span className="v2-inv-num">
                                  #{inv.number ?? inv.id.slice(-8)}
                                </span>
                                <span className="v2-inv-sent">Issued {fmtInvoiceDate(inv.createdAt)}</span>
                              </span>
                            </a>
                          </div>
                          <div className="v2-inv-cust-hit">
                            {inv.energizedEntity.orgHref ? (
                              <Link href={inv.energizedEntity.orgHref} className="v2-inv-link-int">
                                <div className="v2-inv-cust-name">{inv.energizedEntity.label}</div>
                              </Link>
                            ) : (
                              <div className="v2-inv-cust-name">{inv.energizedEntity.label}</div>
                            )}
                            <span className="v2-inv-cust-sub">{inv.energizedEntity.sublabel}</span>
                          </div>
                          <span className={`v2-tbl-status ${st.cls}`} style={{ justifySelf: "center" }}>
                            {st.label}
                          </span>
                          <div className="v2-inv-amt" style={{ textAlign: "right" }}>
                            {fmtMoney(amountCents, inv.currency)}
                          </div>
                          <div className="v2-inv-due">{inv.dueAt ? fmtInvoiceDate(inv.dueAt) : "—"}</div>
                          {pdf ? (
                            <a
                              href={pdf}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="v2-inv-pdf-hit"
                              aria-label={`Download invoice ${inv.number ?? inv.id}`}
                              title="PDF"
                            >
                              <Icon name="download" size={16} />
                            </a>
                          ) : (
                            <span className="v2-inv-pdf-hit" aria-hidden style={{ opacity: 0.3 }}>
                              <Icon name="download" size={16} />
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </SectionCard>
            </div>

            <aside className="v2-arail">
              <SectionCard
                title={
                  <>
                    Billing <em>ops.</em>
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
                  <li>Open invoices pause seat unlocks tied to Employer plans—coordinate with CX before manual comp.</li>
                  <li>Wires and ACH exceptions are marked paid in Stripe; annotate every override in Audit.</li>
                  <li>Training enrollments reconcile through the same Stripe account — watch for duplicated customer ids.</li>
                  <li>Candidate Pro downgrades propagate on period end — cross-check Billing Portal churn flags.</li>
                </ul>
              </SectionCard>

              <SectionCard
                title={
                  <>
                    Product <em>lines.</em>
                  </>
                }
              >
                <div className="v2-rev-list">
                  {[
                    { k: "Employer plans", v: "Starter · Growth · Enterprise (MRR, CAD)." },
                    { k: "Recruiter seats", v: "Per-seat metering on top of org packages." },
                    { k: "Boost credits", v: "Highlighted roles in renewables, oil & gas, utilities." },
                    { k: "Candidate Pro", v: "Profile visibility and apply tooling for specialists." },
                    { k: "Trainings catalogue", v: "Stripe Checkout + Trigger.dev fulfillment hooks." },
                  ].map((row) => (
                    <div key={row.k} className="v2-rev-item">
                      <div className="v2-rev-l">
                        <span>
                          <strong style={{ color: "var(--v2-ink-950)" }}>{row.k}</strong>
                          <span
                            style={{
                              display: "block",
                              marginTop: 4,
                              fontSize: 13,
                              color: "var(--v2-ink-500)",
                            }}
                          >
                            {row.v}
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
                    Shortcuts <em>&amp;</em> links
                  </>
                }
              >
                <ul className="v2-actv-list">
                  <li className="v2-actv-item">
                    <span className="v2-actv-dot sky" />
                    <Link href="/admin/users" className="v2-acard-link">
                      Candidate directory <Icon name="chevronRight" size={12} />
                    </Link>
                  </li>
                  <li className="v2-actv-item">
                    <span className="v2-actv-dot lilac" />
                    <Link href="/admin/trainings" className="v2-acard-link">
                      Training programs <Icon name="chevronRight" size={12} />
                    </Link>
                  </li>
                  <li className="v2-actv-item">
                    <span className="v2-actv-dot" style={{ background: "var(--v2-accent)" }} />
                    <a
                      href="https://dashboard.stripe.com/subscriptions"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="v2-acard-link"
                    >
                      Stripe subscriptions <Icon name="arrowUpRight" size={12} />
                    </a>
                  </li>
                </ul>
              </SectionCard>
            </aside>
          </div>
        </>
      ) : null}
    </>
  );
}

function InvoicesSkeleton() {
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
        <div className="v2-acard" style={{ height: 360, opacity: 0.45 }} />
        <div className="v2-acard" style={{ height: 220, opacity: 0.45 }} />
      </div>
    </>
  );
}
