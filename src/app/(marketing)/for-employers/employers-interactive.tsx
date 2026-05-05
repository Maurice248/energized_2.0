"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/shared/icon";

type Plan = {
  name: string;
  tagline: string;
  monthly: number | null;
  yearly: number | null;
  cost?: string;
  billing?: string;
  featured?: boolean;
  tag?: string;
  features: (string | { text: string; muted: true })[];
  cta: string;
  href: string;
};

const PLANS: Plan[] = [
  {
    name: "Starter",
    tagline: "For occasional hires",
    monthly: 0,
    yearly: 0,
    cost: "Free",
    billing: "No card required",
    features: [
      "Up to 2 active job posts",
      "Basic AI matching (top 10 picks)",
      "50 candidate views per month",
      "Standard messaging",
      "Email support",
      { text: "ATS integrations", muted: true },
      { text: "Team seats", muted: true },
    ],
    cta: "Start free",
    href: "/sign-up?role=employer&plan=starter",
  },
  {
    name: "Growth",
    tagline: "For active hiring teams",
    monthly: 599,
    yearly: 479,
    featured: true,
    tag: "Most popular",
    features: [
      "Unlimited job posts",
      "AI shortlist with rationale (25 ranked / role)",
      "Unlimited candidate views & messaging",
      "Native ATS integrations (Greenhouse, Lever, Ashby)",
      "5 team seats included · $39 each after",
      "Funnel & DEI analytics",
      "Branded careers page",
      "Phone & chat support",
    ],
    cta: "Start 14-day trial",
    href: "/sign-up?role=employer&plan=growth",
  },
  {
    name: "Enterprise",
    tagline: "For 50+ hires per year",
    monthly: null,
    yearly: null,
    cost: "Custom",
    billing: "Annual contract",
    features: [
      "Everything in Growth",
      "Dedicated talent engineer",
      "Workday & custom ATS deep map",
      "SAML SSO + SCIM provisioning",
      "API access & data residency options",
      "Quarterly market briefings",
      "SLA-backed sourcing guarantees",
      "99.95% uptime, SOC 2 Type II",
    ],
    cta: "Talk to sales",
    href: "/contact?topic=enterprise",
  },
];

export function PricingSection() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("yearly");

  return (
    <section className="v2-emp-sec">
      <div className="v2-container">
        <div className="v2-emp-sec-head">
          <div>
            <div className="v2-eyebrow">Pricing</div>
            <h2 className="v2-emp-sec-h" style={{ marginTop: 16 }}>
              Flat fees. <em>No</em> per-hire bounty.
            </h2>
          </div>
          <p className="v2-emp-sec-lede">
            We charge a predictable monthly or annual rate. Hire one engineer
            or fifty &mdash; your bill is the same.
          </p>
        </div>

        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div className="v2-emp-price-toggle" role="tablist" aria-label="Billing cadence">
            <button
              type="button"
              role="tab"
              aria-selected={billing === "monthly"}
              className={billing === "monthly" ? "active" : ""}
              onClick={() => setBilling("monthly")}
            >
              Monthly
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={billing === "yearly"}
              className={billing === "yearly" ? "active" : ""}
              onClick={() => setBilling("yearly")}
            >
              Annual <span className="save">SAVE 20%</span>
            </button>
          </div>
        </div>

        <div className="v2-emp-price-grid">
          {PLANS.map((p) => {
            const price = billing === "yearly" ? p.yearly : p.monthly;
            const billingLabel =
              price === null
                ? p.billing
                : price === 0
                ? p.billing
                : billing === "yearly"
                ? `Billed C$${(price * 12).toLocaleString()} yearly`
                : "Billed monthly · cancel anytime";

            return (
              <div
                key={p.name}
                className={`v2-emp-price ${p.featured ? "featured" : ""}`}
              >
                {p.tag && <div className="v2-emp-price-tag">{p.tag}</div>}
                <div className="v2-emp-price-eye">
                  For{" "}
                  {p.name === "Starter"
                    ? "small teams"
                    : p.name === "Growth"
                    ? "growing teams"
                    : "hiring at scale"}
                </div>
                <div className="v2-emp-price-name">
                  {p.name === "Growth" ? (
                    <>
                      Grow<em>th</em>
                    </>
                  ) : (
                    p.name
                  )}
                </div>
                <div className="v2-emp-price-tagline">{p.tagline}</div>

                <div className="v2-emp-price-cost">
                  {price !== null ? (
                    <>
                      <span className="pre">C$</span>
                      <span className="n">{price}</span>
                      <span className="per">/ mo</span>
                    </>
                  ) : (
                    <span className="n" style={{ fontStyle: "italic" }}>
                      {p.cost ?? "Custom"}
                    </span>
                  )}
                </div>
                <div className="v2-emp-price-billing">{billingLabel}</div>

                <ul className="v2-emp-price-feat">
                  {p.features.map((f, i) =>
                    typeof f === "string" ? (
                      <li key={i}>{f}</li>
                    ) : (
                      <li key={i} className="muted">
                        {f.text}
                      </li>
                    )
                  )}
                </ul>

                <Link href={p.href} className="v2-emp-price-cta">
                  {p.cta}
                  <Icon name="arrowRight" size={14} />
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const MIN_HIRES = 1;
const MAX_HIRES = 100;

export function RoiCalculator() {
  const [hires, setHires] = useState(20);

  const traditionalCost = hires * 18000;
  const energizedCost = hires <= 24 ? 599 * 12 : 999 * 12;
  const savings = traditionalCost - energizedCost;
  const fmt = (n: number) => "C$" + n.toLocaleString();

  return (
    <section className="v2-emp-sec sand">
      <div className="v2-container">
        <div className="v2-emp-roi">
          <div>
            <div className="v2-eyebrow">Run the numbers</div>
            <h2 className="v2-emp-sec-h" style={{ marginTop: 16 }}>
              What it <em>actually</em> costs you to hire.
            </h2>
            <p
              className="v2-emp-sec-lede"
              style={{ marginLeft: 0, maxWidth: 520, marginTop: 24 }}
            >
              The average Canadian energy hire costs{" "}
              <strong style={{ color: "var(--v2-ink-950)" }}>C$18,400</strong>{" "}
              all-in when you tally agency fees, posting spend, recruiter time,
              and lost productivity from a vacant seat. Drag the slider to see
              what we save you.
            </p>

            <div style={{ marginTop: 32 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--v2-font-mono)",
                    fontWeight: 700,
                    fontSize: 11,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "var(--v2-ink-500)",
                  }}
                >
                  Hires per year
                </span>
                <span
                  style={{
                    fontFamily: "var(--v2-font-serif)",
                    fontWeight: 900,
                    fontSize: 48,
                    letterSpacing: "-0.025em",
                    color: "var(--v2-ink-950)",
                    lineHeight: 1,
                  }}
                >
                  {hires}
                </span>
              </div>
              <input
                type="range"
                min={MIN_HIRES}
                max={MAX_HIRES}
                value={hires}
                onChange={(e) => setHires(parseInt(e.target.value, 10))}
                aria-label="Hires per year"
                style={{
                  width: "100%",
                  accentColor: "var(--v2-accent-deep)",
                  height: 6,
                }}
              />
              <div className="v2-emp-roi-slider-row">
                <span>1</span>
                <span>50</span>
                <span>100+</span>
              </div>
            </div>
          </div>

          <div className="v2-emp-roi-card">
            <div className="v2-emp-roi-row">
              <span className="v2-emp-roi-label">Traditional cost</span>
              <span
                className="v2-emp-roi-value"
                style={{
                  color: "var(--v2-ink-500)",
                  textDecoration: "line-through",
                }}
              >
                {fmt(traditionalCost)}
              </span>
            </div>
            <div className="v2-emp-roi-row">
              <span className="v2-emp-roi-label">
                Energized {hires <= 24 ? "Growth" : "Enterprise"}
              </span>
              <span className="v2-emp-roi-value">
                {fmt(energizedCost)}
                <span
                  style={{
                    fontSize: 14,
                    color: "var(--v2-ink-500)",
                    marginLeft: 6,
                  }}
                >
                  /yr
                </span>
              </span>
            </div>
            <div className="v2-emp-roi-row">
              <span className="v2-emp-roi-label">Avg time-to-hire</span>
              <span className="v2-emp-roi-value">
                <em
                  style={{
                    fontStyle: "italic",
                    color: "var(--v2-accent-deep)",
                  }}
                >
                  18 days
                </em>
                <span
                  style={{
                    fontSize: 14,
                    color: "var(--v2-ink-500)",
                    marginLeft: 8,
                    fontFamily: "var(--v2-font-sans)",
                    fontWeight: 400,
                  }}
                >
                  vs. 47 day avg
                </span>
              </span>
            </div>
            <div className="v2-emp-roi-row savings">
              <div>
                <span
                  className="v2-emp-roi-label"
                  style={{ color: "var(--v2-ink-800)" }}
                >
                  You&rsquo;d save
                </span>
                <div
                  style={{
                    fontSize: 11,
                    fontFamily: "var(--v2-font-mono)",
                    fontWeight: 700,
                    color: "var(--v2-ink-700)",
                    marginTop: 2,
                  }}
                >
                  per year, conservative est.
                </div>
              </div>
              <span
                className="v2-emp-roi-value"
                style={{ fontStyle: "italic" }}
              >
                {fmt(Math.max(savings, 0))}
              </span>
            </div>
            <div
              style={{
                marginTop: 24,
                fontFamily: "var(--v2-font-mono)",
                fontWeight: 700,
                fontSize: 10,
                letterSpacing: "0.05em",
                color: "var(--v2-ink-400)",
              }}
            >
              Industry avg via Mercer 2025 Energy Hiring Cost Survey · Energized
              rates exclude one-time setup
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
