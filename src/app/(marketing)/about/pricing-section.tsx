"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Icon } from "@/components/shared/icon";
import {
  EMPLOYER_DISPLAY_PLANS,
  JOBSEEKER_DISPLAY_PLANS,
  type DisplayPlan,
} from "@/lib/billing-display";
import {
  computeCardCta,
  type CardCta,
  type ViewerContext,
} from "@/lib/card-cta";

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

function toPlan(p: DisplayPlan): Plan {
  const isFree = p.priceCents === 0;
  const features: Feature[] = [
    ...p.features,
    ...(p.futureFeatures?.map((t) => ({ text: t, muted: true })) ?? []),
  ];
  return {
    id: p.id,
    name: p.label,
    tagline: p.tagline,
    priceLabel: isFree ? "0" : Math.round(p.priceCents / 100).toString(),
    priceSuffix: isFree ? "always" : "/ month · billed monthly",
    cta: { label: p.cta, href: p.href },
    tone: p.featured ? "featured" : "",
    tag: p.tag,
    features,
  };
}

const SEEKER_PLANS: Plan[] = JOBSEEKER_DISPLAY_PLANS.map(toPlan);

// Skip the employer free tier on /about — paid tiers carry the page narrative.
// "Free" is mentioned in the foot copy + accessible from /sign-up.
const EMPLOYER_PLANS: Plan[] = EMPLOYER_DISPLAY_PLANS.filter(
  (p) => p.priceCents > 0,
).map(toPlan);

export function PricingSection({ viewer }: { viewer: ViewerContext }) {
  // Honor ?plans=seekers|employers from inbound homepage CTAs.
  // Defaults to "employers" for direct visits.
  const params = useSearchParams();
  const initial: "seekers" | "employers" =
    params.get("plans") === "seekers" ? "seekers" : "employers";
  const [audience, setAudience] = useState<"seekers" | "employers">(initial);
  const plans = audience === "seekers" ? SEEKER_PLANS : EMPLOYER_PLANS;

  return (
    <section id="plans" className="v2-pricing">
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
            <PlanCard
              key={p.id}
              plan={p}
              audience={audience}
              viewer={viewer}
            />
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

function PlanCardCta({ cta }: { cta: CardCta }) {
  if (cta.disabled) {
    return (
      <button
        type="button"
        className="v2-pricing-cta"
        disabled
        title={cta.tooltip}
        style={{ opacity: 0.55, cursor: "not-allowed" }}
      >
        {cta.label}
      </button>
    );
  }
  return (
    <Link href={cta.href} className="v2-pricing-cta">
      {cta.label}
      {!cta.isCurrentPlan && <Icon name="arrowRight" size={14} />}
    </Link>
  );
}

function PlanCard({
  plan,
  audience,
  viewer,
}: {
  plan: Plan;
  audience: "seekers" | "employers";
  viewer: ViewerContext;
}) {
  const isFreeJobSeeker = audience === "seekers" && plan.priceLabel === "0";
  const isComingSoon = plan.priceLabel === "—";
  const cta = computeCardCta({
    audience: audience === "seekers" ? "jobseeker" : "employer",
    planId: plan.id,
    defaultHref: plan.cta.href,
    defaultLabel: plan.cta.label,
    viewer,
  });
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
      <PlanCardCta cta={cta} />
    </div>
  );
}
