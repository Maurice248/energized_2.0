"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/shared/icon";

type Feature = string | { text: string; muted: boolean };

type Plan = {
  id: string;
  name: string;
  tagline: string;
  priceLabel: string;
  priceSuffix: string;
  cta: { label: string; href: string };
  tone: "" | "featured" | "primary";
  tag?: string;
  features: Feature[];
};

const SEEKER_PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    tagline: "Get on the radar",
    priceLabel: "0",
    priceSuffix: "always",
    cta: { label: "Create profile", href: "/sign-up" },
    tone: "",
    features: [
      "Unlimited applications",
      "AI-assisted match scoring on every role",
      "Saved searches & bookmarks",
      "Public profile with tickets surfaced",
      { text: "Skills assessments", muted: true },
      { text: "Recruiter messaging", muted: true },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Coming soon",
    priceLabel: "—",
    priceSuffix: "early access",
    cta: { label: "Join waitlist", href: "/contact" },
    tone: "featured",
    tag: "On the roadmap",
    features: [
      "Everything in Free",
      "Skills assessments + verified badges",
      "Priority placement in employer searches",
      "Resume review by an energy specialist",
      "Salary insights & comp comparator",
      "1-on-1 mock interview / quarter",
    ],
  },
];

const EMPLOYER_PLANS: Plan[] = [
  {
    id: "package_a",
    name: "Package A",
    tagline: "Single-role hiring",
    priceLabel: "299",
    priceSuffix: "/ month · billed monthly",
    cta: { label: "Start hiring", href: "/sign-up?role=employer" },
    tone: "",
    features: [
      "1 published role per billing cycle",
      "Full applicant pipeline + email delivery",
      "Branded company page",
      "Recruiter seats (invites)",
      { text: "Multi-role posting", muted: true },
    ],
  },
  {
    id: "package_b",
    name: "Package B",
    tagline: "Building a team",
    priceLabel: "549",
    priceSuffix: "/ month · billed monthly",
    cta: { label: "Start hiring", href: "/sign-up?role=employer" },
    tone: "featured",
    tag: "Most popular",
    features: [
      "3 published roles per billing cycle",
      "Everything in Package A",
      "Pipeline kanban for each role",
      "AI-assisted match scoring",
    ],
  },
  {
    id: "package_c",
    name: "Package C",
    tagline: "Hiring at pace",
    priceLabel: "749",
    priceSuffix: "/ month · billed monthly",
    cta: { label: "Start hiring", href: "/sign-up?role=employer" },
    tone: "primary",
    features: [
      "5 published roles per billing cycle",
      "Everything in Package B",
      "Priority support",
      "Quarterly hiring market briefings",
    ],
  },
];

export function PricingSection() {
  const [audience, setAudience] = useState<"seekers" | "employers">(
    "employers",
  );
  const plans = audience === "seekers" ? SEEKER_PLANS : EMPLOYER_PLANS;

  return (
    <section className="v2-pricing">
      <div className="v2-container">
        <div className="v2-pricing-head">
          <div className="v2-eyebrow" style={{ justifyContent: "center" }}>
            Pricing
          </div>
          <h2>
            Plans that <em>scale</em> with your search.
          </h2>
          <p>
            Free for jobseekers — always. Subscription tiers for employers,
            cancel any time.
          </p>

          <div className="v2-pricing-tabs-row">
            <div className="v2-pricing-tabs">
              <button
                type="button"
                className={`v2-pricing-tab ${audience === "seekers" ? "active" : ""}`}
                onClick={() => setAudience("seekers")}
              >
                <Icon name="user" size={14} />
                For job seekers
              </button>
              <button
                type="button"
                className={`v2-pricing-tab ${audience === "employers" ? "active" : ""}`}
                onClick={() => setAudience("employers")}
              >
                <Icon name="building" size={14} />
                For employers
              </button>
            </div>
          </div>
        </div>

        <div className="v2-pricing-grid">
          {plans.map((p) => (
            <PlanCard key={p.id} plan={p} audience={audience} />
          ))}
        </div>

        <div className="v2-pricing-foot">
          All plans in CAD · Cancel anytime · Education and non-profit pricing
          available — <Link href="/contact">get in touch</Link>.
        </div>
      </div>
    </section>
  );
}

function PlanCard({
  plan,
  audience,
}: {
  plan: Plan;
  audience: "seekers" | "employers";
}) {
  const isFreeJobSeeker = audience === "seekers" && plan.priceLabel === "0";
  const isComingSoon = plan.priceLabel === "—";
  return (
    <div className={`v2-pricing-card ${plan.tone}`}>
      {plan.tag && <span className="v2-pricing-tag">{plan.tag}</span>}
      <div className="v2-pricing-name">{plan.name}</div>
      <h3>{plan.tagline}</h3>
      <div className="v2-pricing-price-row">
        {isComingSoon ? (
          <div className="v2-pricing-price">
            <em>—</em>
          </div>
        ) : isFreeJobSeeker ? (
          <div className="v2-pricing-price">
            <em>Free</em>
          </div>
        ) : (
          <>
            <span className="v2-pricing-currency">C$</span>
            <span className="v2-pricing-price">{plan.priceLabel}</span>
          </>
        )}
        <span className="v2-pricing-period">{plan.priceSuffix}</span>
      </div>
      <ul className="v2-pricing-list">
        {plan.features.map((f, i) => {
          const isObj = typeof f === "object";
          const text = isObj ? f.text : f;
          const muted = isObj && f.muted;
          return (
            <li key={i} className={muted ? "muted" : ""}>
              {text}
            </li>
          );
        })}
      </ul>
      <Link href={plan.cta.href} className="v2-pricing-cta">
        {plan.cta.label}
        <Icon name="arrowRight" size={14} />
      </Link>
    </div>
  );
}
