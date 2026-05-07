"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/shared/icon";
import type { DisplayPlan } from "@/lib/billing-tiers";
import {
  computeCardCta,
  type CardCta,
  type ViewerContext,
} from "@/lib/card-cta";

const TIER_EYEBROWS: Record<string, string> = {
  package_a: "For occasional hires",
  package_b: "For active hiring teams",
  package_c: "For scaling hiring teams",
};

function EmpPlanCta({ cta }: { cta: CardCta }) {
  if (cta.disabled) {
    return (
      <button
        type="button"
        className="v2-emp-price-cta"
        disabled
        title={cta.tooltip}
        style={{ opacity: 0.55, cursor: "not-allowed" }}
      >
        {cta.label}
      </button>
    );
  }
  return (
    <Link href={cta.href} className="v2-emp-price-cta">
      {cta.label}
      {!cta.isCurrentPlan && <Icon name="arrowRight" size={14} />}
    </Link>
  );
}

export function PricingSection({
  plans,
  viewer,
}: {
  plans: DisplayPlan[];
  viewer: ViewerContext;
}) {
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
            Predictable monthly billing. Hire one engineer or three from a
            single posting &mdash; your bill is the same for the tier.
          </p>
        </div>

        <div className="v2-emp-price-grid">
          {plans.map((p) => {
            const cost = Math.round(p.priceCents / 100);
            const letter = p.label.replace("Package ", "");
            const cta = computeCardCta({
              audience: "employer",
              planId: p.id,
              defaultHref: p.href,
              defaultLabel: p.cta,
              viewer,
            });

            return (
              <div
                key={p.id}
                className={`v2-emp-price ${p.featured ? "featured" : ""}`}
              >
                {p.tag && <div className="v2-emp-price-tag">{p.tag}</div>}
                <div className="v2-emp-price-eye">
                  {TIER_EYEBROWS[p.id] ?? "For hiring teams"}
                </div>
                <div className="v2-emp-price-name">
                  Package <em>{letter}</em>
                </div>
                <div className="v2-emp-price-tagline">{p.tagline}</div>

                <div className="v2-emp-price-cost">
                  <span className="pre">C$</span>
                  <span className="n">{cost}</span>
                  <span className="per">/ mo</span>
                </div>
                <div className="v2-emp-price-billing">Cancel any time</div>

                <ul className="v2-emp-price-feat">
                  {p.features.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>

                <EmpPlanCta cta={cta} />
              </div>
            );
          })}
        </div>

        <p
          style={{
            marginTop: 32,
            textAlign: "center",
            fontSize: 14,
            color: "var(--v2-ink-500)",
          }}
        >
          Just looking around?{" "}
          <Link
            href="/sign-up?role=employer"
            style={{
              color: "var(--v2-accent-deep)",
              textDecoration: "underline",
              fontWeight: 700,
            }}
          >
            Create a free employer account
          </Link>{" "}
          &mdash; browse candidates, save shortlists, upgrade when you&rsquo;re
          ready to post.
        </p>
      </div>
    </section>
  );
}

const MIN_HIRES = 1;
const MAX_HIRES = 100;

const TRADITIONAL_COST_PER_HIRE = 18_400;

export type RoiTier = {
  label: string;
  priceCents: number;
  jobsPerCycle: number;
};

export function RoiCalculator({
  tierA,
  tierB,
  tierC,
}: {
  tierA: RoiTier;
  tierB: RoiTier;
  tierC: RoiTier;
}) {
  const [hires, setHires] = useState(20);

  const aMax = tierA.jobsPerCycle * 12;
  const bMax = tierB.jobsPerCycle * 12;
  const cMax = tierC.jobsPerCycle * 12;

  const tier =
    hires <= aMax ? tierA : hires <= bMax ? tierB : tierC;
  const overC = hires > cMax;

  const traditionalCost = hires * TRADITIONAL_COST_PER_HIRE;
  const energizedCost = (tier.priceCents / 100) * 12;
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
              <strong style={{ color: "var(--v2-ink-950)" }}>
                {fmt(TRADITIONAL_COST_PER_HIRE)}
              </strong>{" "}
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
                <span>{bMax}</span>
                <span>{MAX_HIRES}+</span>
              </div>
              <div
                style={{
                  marginTop: 12,
                  fontSize: 12,
                  fontFamily: "var(--v2-font-mono)",
                  color: "var(--v2-ink-500)",
                }}
              >
                Brackets: ≤{aMax} → {tierA.label} · {aMax + 1}&ndash;{bMax} →{" "}
                {tierB.label} · {bMax + 1}&ndash;{cMax} → {tierC.label}
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
                Energized {tier.label}
                {overC && " (×3)"}
              </span>
              <span className="v2-emp-roi-value">
                {overC ? "Custom" : fmt(energizedCost)}
                {!overC && (
                  <span
                    style={{
                      fontSize: 14,
                      color: "var(--v2-ink-500)",
                      marginLeft: 6,
                    }}
                  >
                    /yr
                  </span>
                )}
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
                {overC ? "Talk to us" : fmt(Math.max(savings, 0))}
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
