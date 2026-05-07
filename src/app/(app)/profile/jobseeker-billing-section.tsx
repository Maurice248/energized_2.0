"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

const VALID_SUBSCRIBE = new Set(["gold", "platinum"]);

export function JobseekerBillingSection({ id }: { id?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const current = api.jobseekerBilling.getCurrent.useQuery();
  const tiers = api.jobseekerBilling.listTiers.useQuery();
  const utils = api.useUtils();

  const [error, setError] = useState<string | null>(null);

  const checkout = api.jobseekerBilling.createCheckoutSession.useMutation({
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: (e) => setError(e.message),
  });
  const portal = api.jobseekerBilling.createPortalSession.useMutation({
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: (e) => setError(e.message),
  });
  const cancel = api.jobseekerBilling.cancel.useMutation({
    onSuccess: () => {
      void utils.jobseekerBilling.getCurrent.invalidate();
    },
    onError: (e) => setError(e.message),
  });
  const sync = api.jobseekerBilling.syncFromStripe.useMutation({
    onSuccess: () => {
      void utils.jobseekerBilling.getCurrent.invalidate();
    },
    onError: (e) => setError(e.message),
  });
  const switchTier = api.jobseekerBilling.switchTier.useMutation({
    onSuccess: () => {
      void utils.jobseekerBilling.getCurrent.invalidate();
    },
    onError: (e) => setError(e.message),
  });

  // When arriving from a marketing card or sign-up with ?subscribe=<tier>,
  // surface a "Continue to payment / Pay later" confirmation instead of
  // auto-firing — the user might have picked the plan by mistake. They can
  // always subscribe later from this same page.
  const [pendingTier, setPendingTier] = useState<"gold" | "platinum" | null>(
    null,
  );
  const seenSubscribeRef = useRef(false);
  useEffect(() => {
    if (seenSubscribeRef.current) return;
    if (current.isLoading) return;
    const wanted = params.get("subscribe");
    if (!wanted || !VALID_SUBSCRIBE.has(wanted)) return;
    seenSubscribeRef.current = true;
    if (current.data?.tier === wanted) return; // already on this tier
    setPendingTier(wanted as "gold" | "platinum");
  }, [current.isLoading, current.data?.tier, params]);

  function dismissPending() {
    setPendingTier(null);
    const next = new URLSearchParams(params.toString());
    next.delete("subscribe");
    const qs = next.toString();
    router.replace(`/profile${qs ? `?${qs}` : ""}#pp-billing`);
  }

  if (current.isLoading || tiers.isLoading) {
    return (
      <section id={id} className="pp-section" style={{ scrollMarginTop: 100 }}>
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
  const stripeReady = data?.stripeEnabled ?? false;
  const subscribed = Boolean(data?.tier);

  return (
    <section id={id} className="pp-section" style={{ scrollMarginTop: 100 }}>
      <div className="pp-section-head">
        <div>
          <div className="pp-section-title">Plan &amp; billing</div>
          <div className="pp-section-sub">
            {subscribed
              ? `Renews ${formatDate(data?.currentPeriodEnd)}`
              : "Free forever — upgrade for visibility tools"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {stripeReady && (
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
          {subscribed && (
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

      {pendingTier &&
        (() => {
          const t = tierList.find((x) => x.id === pendingTier);
          if (!t) return null;
          return (
            <div
              style={{
                padding: 22,
                marginBottom: 16,
                background: "var(--v2-ink-950)",
                color: "white",
                borderRadius: "var(--v2-r-xl)",
                display: "flex",
                flexWrap: "wrap",
                gap: 16,
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ minWidth: 0, flex: "1 1 320px" }}>
                <div
                  style={{
                    fontFamily: "var(--v2-font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--v2-accent)",
                    marginBottom: 6,
                  }}
                >
                  Confirm subscription
                </div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>
                  Ready to subscribe to {t.label}?
                </div>
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 13,
                    color: "var(--v2-ink-300)",
                  }}
                >
                  {formatPriceCents(t.priceCents)} / mo &middot; cancel any time.
                  No charge until you confirm in Stripe.
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="v2-btn v2-btn-accent v2-btn-sm"
                  onClick={() => checkout.mutate({ tier: pendingTier })}
                  disabled={
                    checkout.isPending || !stripeReady || !t.configured
                  }
                  title={
                    !stripeReady
                      ? "Stripe not configured."
                      : !t.configured
                        ? `${t.label} price id not set in env.`
                        : undefined
                  }
                >
                  {checkout.isPending
                    ? "Loading…"
                    : `Continue to payment for ${t.label} →`}
                </button>
                <button
                  type="button"
                  className="v2-btn v2-btn-ghost-dark v2-btn-sm"
                  onClick={dismissPending}
                  disabled={checkout.isPending}
                >
                  Pay later
                </button>
              </div>
            </div>
          );
        })()}

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
          buttons are disabled until <code>STRIPE_SECRET_KEY</code>,{" "}
          <code>STRIPE_PRICE_PACKAGE_GOLD</code> and{" "}
          <code>STRIPE_PRICE_PACKAGE_PLATINUM</code> env vars are set.
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
                  {tierList.find((t) => t.id === data.tier)?.label ??
                    data.tier}
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
            </div>

            {!data.cancelAtPeriodEnd && (
              <div style={{ marginTop: 16 }}>
                <button
                  type="button"
                  className="v2-btn v2-btn-ghost v2-btn-sm"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Cancel your subscription? You'll keep access until the end of the current billing period.",
                      )
                    ) {
                      cancel.mutate();
                    }
                  }}
                  disabled={cancel.isPending || !stripeReady}
                >
                  {cancel.isPending ? "Cancelling…" : "Cancel subscription"}
                </button>
              </div>
            )}

            {data.cancelAtPeriodEnd && (
              <div
                style={{
                  marginTop: 16,
                  padding: "10px 14px",
                  background: "var(--v2-ink-50)",
                  borderRadius: 10,
                  fontSize: 13,
                  color: "var(--v2-ink-700)",
                }}
              >
                Your subscription will end on{" "}
                {formatDate(data.currentPeriodEnd)}. To resume, use{" "}
                <button
                  type="button"
                  onClick={() => portal.mutate()}
                  disabled={portal.isPending}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--v2-accent-deep)",
                    fontWeight: 700,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  Manage billing
                </button>
                .
              </div>
            )}
          </div>

          {/* Switch tier */}
          <div style={{ marginTop: 24 }}>
            <div
              style={{
                fontFamily: "var(--v2-font-mono)",
                fontSize: 11,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--v2-ink-500)",
                marginBottom: 12,
              }}
            >
              Switch tier
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 12,
              }}
            >
              {tierList
                .filter((t) => t.id !== data.tier)
                .map((t) => {
                  const currentIdx = tierList.findIndex(
                    (x) => x.id === data.tier,
                  );
                  const targetIdx = tierList.findIndex((x) => x.id === t.id);
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
        </>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
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
                  checkout.isPending || !stripeReady || !t.configured
                }
                title={
                  !stripeReady
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
    </section>
  );
}
