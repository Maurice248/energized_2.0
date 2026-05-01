"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Icon } from "@/components/shared/icon";
import { api } from "@/lib/trpc/client";

function formatPriceCents(cents: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function BillingSection({ id }: { id?: string }) {
  const current = api.billing.getCurrent.useQuery();
  const tiers = api.billing.listTiers.useQuery();
  const utils = api.useUtils();

  const [error, setError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [disposition, setDisposition] = useState<
    "close_immediate" | "close_at_period_end"
  >("close_at_period_end");

  const checkout = api.billing.createCheckoutSession.useMutation({
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: (e) => setError(e.message),
  });
  const portal = api.billing.createPortalSession.useMutation({
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: (e) => setError(e.message),
  });
  const cancel = api.billing.cancel.useMutation({
    onSuccess: () => {
      setCancelOpen(false);
      void utils.billing.getCurrent.invalidate();
    },
    onError: (e) => setError(e.message),
  });
  const sync = api.billing.syncFromStripe.useMutation({
    onSuccess: () => {
      void utils.billing.getCurrent.invalidate();
    },
    onError: (e) => setError(e.message),
  });
  const switchTier = api.billing.switchTier.useMutation({
    onSuccess: () => {
      void utils.billing.getCurrent.invalidate();
    },
    onError: (e) => setError(e.message),
  });

  if (current.isLoading || tiers.isLoading) {
    return (
      <section
        id={id}
        className="pp-section"
        style={{ scrollMarginTop: 100 }}
      >
        <div className="pp-section-head">
          <div>
            <div className="pp-section-title">Plan &amp; billing</div>
            <div className="pp-section-sub">Loading…</div>
          </div>
        </div>
      </section>
    );
  }

  const data = current.data;
  const tierList = tiers.data ?? [];
  const canManage = data?.role === "owner" || data?.role === "admin";
  const stripeReady = data?.stripeEnabled ?? false;

  const subscribed = Boolean(data?.tier);
  const usagePct = data?.quota
    ? Math.min(100, Math.round((data.publishedThisCycle / data.quota) * 100))
    : 0;

  return (
    <section id={id} className="pp-section" style={{ scrollMarginTop: 100 }}>
      <div className="pp-section-head">
        <div>
          <div className="pp-section-title">Plan &amp; billing</div>
          <div className="pp-section-sub">
            {subscribed
              ? `Renews ${formatDate(data?.currentPeriodEnd)}`
              : "Pick a plan to start posting roles"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {canManage && stripeReady && (
            <button
              type="button"
              onClick={() => sync.mutate()}
              disabled={sync.isPending}
              title="Refresh subscription state from Stripe"
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--v2-ink-500)",
                cursor: sync.isPending ? "default" : "pointer",
                padding: "6px 4px",
              }}
            >
              {sync.isPending ? "Refreshing…" : "Refresh"}
            </button>
          )}
          {subscribed && canManage && (
            <button
              className="v2-btn v2-btn-ghost v2-btn-sm"
              onClick={() => portal.mutate()}
              disabled={portal.isPending || !stripeReady}
              title={!stripeReady ? "Stripe not configured" : undefined}
            >
              Manage billing <Icon name="arrowUpRight" size={13} />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            padding: "10px 14px",
            background: "var(--v2-coral-soft)",
            color: "#A63A20",
            borderRadius: 10,
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {!stripeReady && (
        <div
          style={{
            padding: "10px 14px",
            background: "var(--v2-ink-50)",
            border: "1px dashed var(--v2-ink-200)",
            borderRadius: 10,
            fontSize: 12,
            color: "var(--v2-ink-600)",
            marginBottom: 16,
          }}
        >
          Stripe isn&apos;t configured on this environment. Subscribe and Manage
          buttons are disabled until <code>STRIPE_SECRET_KEY</code> and the
          three <code>STRIPE_PRICE_PACKAGE_*</code> env vars are set.
        </div>
      )}

      {subscribed && data ? (
        <>
          <div
            style={{
              padding: 22,
              border: "1px solid var(--v2-ink-200)",
              borderRadius: "var(--v2-r-xl)",
              background: "white",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: "var(--v2-font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--v2-ink-500)",
                    marginBottom: 4,
                  }}
                >
                  Current plan
                </div>
                <div
                  style={{
                    fontFamily: "var(--v2-font-serif)",
                    fontSize: 32,
                    fontWeight: 900,
                    fontStyle: "italic",
                  }}
                >
                  {tierList.find((t) => t.id === data.tier)?.label ?? data.tier}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    color: "var(--v2-ink-600)",
                    marginTop: 4,
                  }}
                >
                  {data.status === "active"
                    ? "Active"
                    : data.status === "past_due"
                      ? "Payment past due"
                      : data.status}
                  {data.cancelAtPeriodEnd &&
                    ` · ends ${formatDate(data.currentPeriodEnd)}`}
                </div>
              </div>
              <div style={{ minWidth: 200 }}>
                <div
                  style={{
                    fontFamily: "var(--v2-font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--v2-ink-500)",
                    marginBottom: 6,
                  }}
                >
                  This cycle
                </div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>
                  {data.publishedThisCycle} of {data.quota} jobs
                </div>
                <div
                  style={{
                    height: 6,
                    background: "var(--v2-ink-100)",
                    borderRadius: 4,
                    overflow: "hidden",
                    marginTop: 8,
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${usagePct}%`,
                      background:
                        usagePct >= 100
                          ? "var(--v2-coral)"
                          : "var(--v2-accent)",
                    }}
                  />
                </div>
              </div>
            </div>
            {canManage && !data.cancelAtPeriodEnd && (
              <div
                style={{
                  marginTop: 18,
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <button
                  className="v2-btn v2-btn-ghost v2-btn-sm"
                  onClick={() => setCancelOpen(true)}
                  disabled={cancel.isPending || !stripeReady}
                >
                  Cancel subscription
                </button>
              </div>
            )}
            {data.cancelAtPeriodEnd && (
              <div
                style={{
                  marginTop: 14,
                  padding: "10px 14px",
                  background: "var(--v2-coral-soft)",
                  color: "#A63A20",
                  borderRadius: 10,
                  fontSize: 13,
                }}
              >
                Subscription ends {formatDate(data.currentPeriodEnd)}.
                {data.cancellationDisposition === "close_immediate"
                  ? " Live roles were closed when you cancelled."
                  : " Live roles stay open until then, then auto-close."}
                {canManage && (
                  <span>
                    {" "}
                    To resume,{" "}
                    <button
                      className="v2-btn-link"
                      style={{ color: "#A63A20", fontWeight: 700 }}
                      onClick={() => portal.mutate()}
                      disabled={portal.isPending}
                    >
                      reactivate via the portal
                    </button>
                    .
                  </span>
                )}
              </div>
            )}
          </div>

          {canManage && !data.cancelAtPeriodEnd && (
            <div style={{ marginTop: 18 }}>
              <div
                style={{
                  fontFamily: "var(--v2-font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--v2-ink-500)",
                  marginBottom: 10,
                }}
              >
                Switch plan
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 12,
                }}
              >
                {tierList
                  .filter((t) => t.id !== data.tier)
                  .map((t) => {
                    const currentIdx = tierList.findIndex(
                      (x) => x.id === data.tier,
                    );
                    const targetIdx = tierList.findIndex(
                      (x) => x.id === t.id,
                    );
                    const direction =
                      targetIdx > currentIdx ? "Upgrade" : "Downgrade";
                    return (
                      <div
                        key={t.id}
                        style={{
                          padding: 16,
                          border: "1px solid var(--v2-ink-200)",
                          borderRadius: "var(--v2-r-lg)",
                          background: "white",
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "baseline",
                            gap: 8,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 14,
                              fontWeight: 700,
                              color: "var(--v2-ink-950)",
                            }}
                          >
                            {t.label}
                          </span>
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: "var(--v2-ink-700)",
                            }}
                          >
                            {formatPriceCents(t.priceCents)}
                            <span
                              style={{
                                fontSize: 11,
                                color: "var(--v2-ink-500)",
                              }}
                            >
                              {" "}
                              /mo
                            </span>
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--v2-ink-500)",
                          }}
                        >
                          {t.jobsPerCycle} job
                          {t.jobsPerCycle === 1 ? "" : "s"} per cycle
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              !window.confirm(
                                `${direction} to ${t.label}? Stripe charges or credits the prorated difference for the rest of this cycle.`,
                              )
                            )
                              return;
                            switchTier.mutate({ tier: t.id });
                          }}
                          disabled={
                            switchTier.isPending ||
                            !stripeReady ||
                            !t.configured
                          }
                          className="v2-btn v2-btn-ghost v2-btn-sm"
                          style={{ marginTop: "auto" }}
                          title={
                            !stripeReady
                              ? "Stripe not configured."
                              : !t.configured
                                ? `${t.label} price id not set in env.`
                                : undefined
                          }
                        >
                          {switchTier.isPending
                            ? "Switching…"
                            : `${direction} to ${t.label}`}
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 14,
          }}
        >
          {tierList.map((t) => (
            <div
              key={t.id}
              style={{
                padding: 22,
                border: "1px solid var(--v2-ink-200)",
                borderRadius: "var(--v2-r-xl)",
                background: "white",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div
                style={{
                  fontFamily: "var(--v2-font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--v2-ink-500)",
                }}
              >
                {t.label}
              </div>
              <div
                style={{
                  fontFamily: "var(--v2-font-serif)",
                  fontSize: 28,
                  fontWeight: 900,
                  fontStyle: "italic",
                }}
              >
                {formatPriceCents(t.priceCents)}
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 400,
                    fontStyle: "normal",
                    color: "var(--v2-ink-500)",
                    marginLeft: 4,
                  }}
                >
                  /mo
                </span>
              </div>
              <ul
                style={{
                  paddingLeft: 18,
                  display: "grid",
                  gap: 6,
                  fontSize: 13,
                  color: "var(--v2-ink-700)",
                  margin: 0,
                  flex: 1,
                }}
              >
                {t.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <button
                className="v2-btn v2-btn-primary v2-btn-sm"
                onClick={() => checkout.mutate({ tier: t.id })}
                disabled={
                  checkout.isPending || !stripeReady || !t.configured || !canManage
                }
                title={
                  !canManage
                    ? "Only owners and admins can subscribe."
                    : !stripeReady
                      ? "Stripe not configured."
                      : !t.configured
                        ? `${t.label} price id not set in env.`
                        : undefined
                }
              >
                {checkout.isPending ? "Loading…" : `Subscribe to ${t.label}`}
              </button>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={cancelOpen}
        onOpenChange={(o) => setCancelOpen(o)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle style={{ fontStyle: "italic" }}>
              Cancel subscription?
            </DialogTitle>
            <DialogDescription>
              You&apos;ll still be billed until{" "}
              {formatDate(data?.currentPeriodEnd)} per Stripe&apos;s terms.
              Choose what happens to your live roles.
            </DialogDescription>
          </DialogHeader>
          <div style={{ display: "grid", gap: 10, marginBottom: 8 }}>
            <label
              style={{
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
                padding: 12,
                border:
                  disposition === "close_at_period_end"
                    ? "1px solid var(--v2-ink-950)"
                    : "1px solid var(--v2-ink-200)",
                borderRadius: 10,
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name="dispo"
                value="close_at_period_end"
                checked={disposition === "close_at_period_end"}
                onChange={() => setDisposition("close_at_period_end")}
                style={{ marginTop: 4 }}
              />
              <div>
                <div style={{ fontWeight: 700 }}>
                  Keep them live until {formatDate(data?.currentPeriodEnd)}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--v2-ink-500)",
                    marginTop: 2,
                  }}
                >
                  Recommended. Roles auto-close on the renewal date.
                </div>
              </div>
            </label>
            <label
              style={{
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
                padding: 12,
                border:
                  disposition === "close_immediate"
                    ? "1px solid var(--v2-ink-950)"
                    : "1px solid var(--v2-ink-200)",
                borderRadius: 10,
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name="dispo"
                value="close_immediate"
                checked={disposition === "close_immediate"}
                onChange={() => setDisposition("close_immediate")}
                style={{ marginTop: 4 }}
              />
              <div>
                <div style={{ fontWeight: 700 }}>Close them immediately</div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--v2-ink-500)",
                    marginTop: 2,
                  }}
                >
                  Live roles flip to Closed right now. You can reopen later.
                </div>
              </div>
            </label>
          </div>
          <DialogFooter>
            <button
              className="v2-btn v2-btn-ghost v2-btn-sm"
              onClick={() => setCancelOpen(false)}
              disabled={cancel.isPending}
            >
              Keep subscription
            </button>
            <button
              className="v2-btn v2-btn-primary v2-btn-sm"
              onClick={() => cancel.mutate({ disposition })}
              disabled={cancel.isPending}
            >
              {cancel.isPending ? "Cancelling…" : "Cancel subscription"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
