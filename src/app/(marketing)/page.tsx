import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { jobListings, user } from "@/server/db/schema";
import { SiteHeader } from "@/components/marketing/site-header";
import { Icon } from "@/components/shared/icon";
import { TIERS, JOBSEEKER_TIERS } from "@/lib/billing-tiers";
import { getViewerContext } from "@/lib/viewer-context";
import {
  computeCardCta,
  type CardCta,
  type ViewerContext,
} from "@/lib/card-cta";

function PlanCardButton({ cta }: { cta: CardCta }) {
  if (cta.disabled) {
    return (
      <button
        type="button"
        className="v2-plan-cta"
        disabled
        title={cta.tooltip}
        style={{ opacity: 0.55, cursor: "not-allowed" }}
      >
        {cta.label}
      </button>
    );
  }
  return (
    <Link href={cta.href} className="v2-plan-cta">
      {cta.label}
      {!cta.isCurrentPlan && <Icon name="arrowRight" size={13} />}
    </Link>
  );
}

export const metadata: Metadata = {
  // Override the title template since the landing IS "Energized — …".
  title: { absolute: "Energized — jobs in Canadian energy" },
  description:
    "The specialized job network for Canada's energy sector — oil & gas, renewables, nuclear, utilities, hydrogen, power.",
  alternates: { canonical: "/" },
};

export default async function LandingPage() {
  const [
    [{ n: liveRoles } = { n: 0 }],
    [{ n: candidateCount } = { n: 0 }],
  ] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(jobListings)
      .where(eq(jobListings.status, "published")),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(user)
      .where(eq(user.role, "jobseeker")),
  ]);

  return (
    <>
      <SiteHeader active="home" />
      <main style={{ flex: 1 }}>
        <Hero liveRoles={liveRoles} />
        <Marquee />
        <SectorIndex />
        <AIShowcase liveRoles={liveRoles} candidateCount={candidateCount} />
        <HowItWorks />
        <Quotes />
        <PricingTeaser viewer={await getViewerContext()} />
        <FinalCta />
      </main>
    </>
  );
}

/* ---------- hero ---------- */

function Hero({ liveRoles }: { liveRoles: number }) {
  return (
    <section className="v2-hero">
      <div className="v2-container v2-hero-inner">
        <div className="v2-hero-copy">
          <div className="v2-eyebrow">Est. 2026 · Calgary → National</div>
          <h1
            className="v2-display v2-hero-headline"
            style={{ color: "var(--v2-ink-950)" }}
          >
            Careers for
            <br />
            the <em style={{ fontStyle: "italic" }}>energy</em>
            <br />
            in motion.
          </h1>
          <div className="v2-hero-pill-row">
            <span className="v2-hero-pill">AI-matched</span>
            <span className="v2-hero-pill-note">to sector-specific expertise</span>
          </div>
          <p className="v2-hero-sub">
            From reservoir engineers to renewable technicians, Energized pairs
            Canada&rsquo;s skilled workforce with roles that fit — faster,
            fairer, with AI that actually understands sector-specific
            expertise.
          </p>
          <div className="v2-hero-actions">
            <Link href="/sign-up" className="v2-btn v2-btn-primary v2-btn-lg">
              Find my role <Icon name="arrowUpRight" size={18} />
            </Link>
            <Link href="/jobs" className="v2-btn v2-btn-ghost v2-btn-lg">
              Browse open roles
            </Link>
          </div>
          <div className="v2-hero-meta">
            {liveRoles >= 5 && (
              <div className="v2-hero-meta-item">
                <div className="v2-hero-meta-value">{liveRoles}</div>
                <div className="v2-hero-meta-label">
                  Live roles across Canadian energy
                </div>
              </div>
            )}
            <div className="v2-hero-meta-item">
              <div className="v2-hero-meta-value">
                6
                <span
                  style={{
                    fontSize: 18,
                    color: "var(--v2-ink-500)",
                    fontFamily: "var(--v2-font-sans)",
                  }}
                >
                  {" "}sectors
                </span>
              </div>
              <div className="v2-hero-meta-label">
                Oil &amp; gas, renewables, nuclear, utilities, hydrogen, power
              </div>
            </div>
            <div className="v2-hero-meta-item">
              <div className="v2-hero-meta-value">
                1<span style={{ color: "var(--v2-accent-deep)" }}>-click</span>
              </div>
              <div className="v2-hero-meta-label">
                Apply with a cover note pre-drafted from your profile
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            position: "relative",
            borderRadius: "var(--v2-r-xl)",
            overflow: "hidden",
            border: "1px solid var(--v2-ink-200)",
            background: "var(--v2-ink-950)",
            alignSelf: "stretch",
            minHeight: 560,
            width: "100%",
          }}
        >
          <Image
            src="/hero-energy-mix.svg"
            alt="Canadian energy mix — wind, transmission, oil and solar under a starlit sky"
            fill
            style={{ objectFit: "cover", objectPosition: "center bottom" }}
            priority
          />
        </div>
      </div>
    </section>
  );
}

/* ---------- marquee ---------- */

const MARQUEE_ITEMS: { label: string; bg: string; fg: string }[] = [
  { label: "Wind Techs", bg: "#1CAAE2", fg: "#0B0D12" },
  { label: "Controls Engineers", bg: "#7CC7FF", fg: "#0B0D12" },
  { label: "Solar PMs", bg: "#FF7A59", fg: "#fff" },
  { label: "Reservoir Eng", bg: "#B9A8FF", fg: "#0B0D12" },
  { label: "Geologists", bg: "#F5F0E6", fg: "#0B0D12" },
  { label: "Grid Operators", bg: "#0B0D12", fg: "#1CAAE2" },
  { label: "Pipeline Tech", bg: "#004984", fg: "#fff" },
  { label: "Safety Officers", bg: "#2A303F", fg: "#fff" },
];

function Marquee() {
  const track = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];
  return (
    <div className="v2-marquee" aria-hidden="true">
      <div className="v2-marquee-track">
        {track.map((it, i) => (
          <div key={i} className="v2-marquee-item">
            <span
              className="dot"
              style={{ background: it.bg, color: it.fg }}
            >
              E
            </span>
            {it.label}
            <span style={{ color: "var(--v2-ink-300)", marginLeft: 16 }}>
              ✦
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- sector index ---------- */

const SECTORS = [
  { n: "01", t: "Oil & Gas", q: "oil_gas", tags: ["Upstream", "Midstream", "LNG"] },
  { n: "02", t: "Renewables", q: "renewables", tags: ["Wind", "Solar", "Hydro"] },
  { n: "03", t: "Power Utilities", q: "utilities", tags: ["Grid", "Distribution"] },
  { n: "04", t: "Nuclear", q: "nuclear", tags: ["SMR", "CANDU"] },
  { n: "05", t: "Hydrogen & Carbon Capture", q: "hydrogen", tags: ["Green H₂", "CCUS"] },
  { n: "06", t: "Power", q: "power", tags: ["Generation", "Transmission"] },
];

function SectorIndex() {
  return (
    <section className="v2-section">
      <div className="v2-container">
        <div className="v2-index-head">
          <div>
            <div className="v2-eyebrow">Sector index</div>
            <h2 className="v2-h2" style={{ marginTop: 16 }}>
              Canada&rsquo;s energy is a{" "}
              <em
                style={{
                  fontStyle: "italic",
                  color: "var(--v2-accent-deep)",
                }}
              >
                portfolio
              </em>
              .<br />
              So is our talent network.
            </h2>
          </div>
          <p>
            Every role here is vetted against the sector&rsquo;s unique skill
            map — no more conflating a pipeline welder with a substation
            technician.
          </p>
        </div>

        <div className="v2-cat-row">
          {SECTORS.map((cat) => (
            <Link
              key={cat.n}
              href={`/jobs?sector=${cat.q}`}
              className="v2-cat"
              style={{ color: "inherit" }}
            >
              <div className="v2-cat-num">{cat.n}</div>
              <div className="v2-cat-title">{cat.t}</div>
              <div className="v2-cat-meta">
                {cat.tags.map((tg) => (
                  <span key={tg} className="v2-chip v2-chip-outline">
                    {tg}
                  </span>
                ))}
              </div>
              <div className="v2-cat-count">View roles</div>
              <div className="v2-cat-arrow">
                <Icon name="arrowRight" size={16} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- AI showcase ---------- */

function AIShowcase({
  liveRoles,
  candidateCount,
}: {
  liveRoles: number;
  candidateCount: number;
}) {
  return (
    <section>
      <div className="v2-ai">
        <div className="v2-ai-inner">
          <div>
            <div className="v2-eyebrow v2-eyebrow-light">
              AI that speaks energy
            </div>
            <h2 className="v2-h2" style={{ marginTop: 16 }}>
              Not another
              <br />
              keyword match. <em>Context.</em>
            </h2>
            <p>
              Our AI understands the difference between a DCS operator and a
              SCADA engineer, between Class-1 and Class-4 estimator certs,
              and between a rotating and fixed-equipment background.
            </p>
            <div className="v2-ai-stat">
              <div>
                <div className="v2-ai-stat-v">{liveRoles}</div>
                <div className="v2-ai-stat-l">
                  Live energy roles, AI-mapped by sector
                </div>
              </div>
              <div>
                <div className="v2-ai-stat-v">{candidateCount}</div>
                <div className="v2-ai-stat-l">
                  Energy professionals on the network
                </div>
              </div>
            </div>
          </div>
          <div className="v2-ai-visual">
            <div className="v2-ai-chat">
              <div className="v2-ai-chat-head">
                <div className="v2-ai-chat-avatar">E</div>
                <div>
                  <div className="v2-ai-chat-name">
                    Ember · your career AI
                  </div>
                  <div className="v2-ai-chat-status">
                    <span className="dot"></span>Typing
                  </div>
                </div>
              </div>
              <div className="v2-ai-msg v2-ai-msg-in">
                I see you have 8 years in upstream controls with Rockwell.
                3 roles in Calgary match 90%+. Want me to auto-tailor your
                resume for each?
              </div>
              <div className="v2-ai-msg v2-ai-msg-out">
                Yes — prioritize hybrid with P.Eng sponsorship.
              </div>
              <div className="v2-ai-msg v2-ai-msg-in">
                Done. Ark Energy (96%), CanFlow (91%), BrightGrid (88%).
                Ark is hiring urgently.
              </div>
              <div className="v2-ai-suggestions">
                <span className="v2-ai-sugg">Apply to all 3</span>
                <span className="v2-ai-sugg">Compare salaries</span>
                <span className="v2-ai-sugg">Prep interview</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- how it works ---------- */

const STEPS = [
  {
    n: "01",
    icon: "user" as const,
    title: "Tell us the work you do",
    body:
      "Skip the resume upload. Answer 6 questions about projects, tools, certs, and where you'd move. Ember builds your profile.",
  },
  {
    n: "02",
    icon: "sparkles" as const,
    title: "Meet your matches",
    body:
      "Ember surfaces 3–5 roles a week, ranked by contextual fit — not by who paid the most for visibility.",
  },
  {
    n: "03",
    icon: "briefcase" as const,
    title: "Interview, negotiate, accept",
    body:
      "We handle intros, pre-interview briefs, and pay-band research. You focus on the conversation.",
  },
];

function HowItWorks() {
  return (
    <section className="v2-section">
      <div className="v2-container">
        <div className="v2-index-head">
          <div>
            <div className="v2-eyebrow">The process</div>
            <h2 className="v2-h2" style={{ marginTop: 16 }}>
              Three steps. Zero{" "}
              <em style={{ fontStyle: "italic" }}>resume-rot</em>.
            </h2>
          </div>
        </div>
        <div className="v2-steps">
          {STEPS.map((s) => (
            <div key={s.n} className="v2-step">
              <div className="v2-step-num">{s.n}</div>
              <div className="v2-step-ico">
                <Icon name={s.icon} size={22} />
              </div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- quotes ---------- */

function Quotes() {
  return (
    <section className="v2-section" style={{ paddingTop: 0 }}>
      <div className="v2-container">
        <div className="v2-index-head">
          <div>
            <div className="v2-eyebrow">Field notes</div>
            <h2 className="v2-h2" style={{ marginTop: 16 }}>
              What the industry says.
            </h2>
          </div>
        </div>
        <div className="v2-quotes">
          <div className="v2-quote-main">
            <div className="v2-quote-mark">&ldquo;</div>
            <p>
              Ember surfaced a senior instrumentation role at a
              carbon-capture project I didn&rsquo;t know existed — 40 km from
              my house, with the exact PLC stack I&rsquo;ve run for a decade.
              Interview to offer: nine days.
            </p>
            <div className="v2-quote-author">
              <div
                className="v2-quote-avatar"
                style={{ background: "#1CAAE2" }}
              >
                DM
              </div>
              <div>
                <div
                  style={{
                    fontWeight: 600,
                    color: "var(--v2-ink-950)",
                  }}
                >
                  Devin M.
                </div>
                <div
                  style={{ fontSize: 13, color: "var(--v2-ink-500)" }}
                >
                  Sr. I&amp;C Engineer · Carbon-capture project
                </div>
              </div>
            </div>
          </div>
          <div className="v2-quote-side">
            <div>
              <div className="v2-eyebrow v2-eyebrow-light">Employer</div>
              <h3 style={{ marginTop: 14 }}>
                &ldquo;We filled a bench of 12 wind techs in six weeks.&rdquo;
              </h3>
              <p>
                Normally it&rsquo;s a six-month saga. The sector-specific
                vetting alone saved our team 200+ hours of phone screens.
              </p>
            </div>
            <div
              style={{
                marginTop: 28,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                className="v2-quote-avatar"
                style={{ background: "#FF7A59" }}
              >
                KT
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Kate T.</div>
                <div
                  style={{ fontSize: 13, color: "var(--v2-ink-300)" }}
                >
                  Head of Talent · Wind farm operator
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- pricing teaser ---------- */

function PricingTeaser({ viewer }: { viewer: ViewerContext }) {
  const fmtPrice = (cents: number) => `C$${Math.round(cents / 100)}`;
  const a = TIERS.package_a;
  const b = TIERS.package_b;
  const c = TIERS.package_c;
  const gold = JOBSEEKER_TIERS.gold;
  const platinum = JOBSEEKER_TIERS.platinum;

  const ctaJsFree = computeCardCta({
    audience: "jobseeker",
    planId: "jobseeker_free",
    defaultHref: "/sign-up",
    defaultLabel: "Sign up free",
    viewer,
  });
  const ctaJsGold = computeCardCta({
    audience: "jobseeker",
    planId: "jobseeker_gold",
    defaultHref: "/sign-up?plan=gold",
    defaultLabel: "Get Gold",
    viewer,
  });
  const ctaJsPlatinum = computeCardCta({
    audience: "jobseeker",
    planId: "jobseeker_platinum",
    defaultHref: "/sign-up?plan=platinum",
    defaultLabel: "Get Platinum",
    viewer,
  });
  const ctaEmpA = computeCardCta({
    audience: "employer",
    planId: "package_a",
    defaultHref: "/sign-up?plan=package_a&role=employer",
    defaultLabel: "Choose Package A",
    viewer,
  });
  const ctaEmpB = computeCardCta({
    audience: "employer",
    planId: "package_b",
    defaultHref: "/sign-up?plan=package_b&role=employer",
    defaultLabel: "Choose Package B",
    viewer,
  });
  const ctaEmpC = computeCardCta({
    audience: "employer",
    planId: "package_c",
    defaultHref: "/sign-up?plan=package_c&role=employer",
    defaultLabel: "Choose Package C",
    viewer,
  });

  const sectionLabelStyle: React.CSSProperties = {
    fontFamily: "var(--v2-font-mono)",
    fontWeight: 700,
    fontSize: 12,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "var(--v2-ink-500)",
    marginBottom: 18,
    display: "flex",
    alignItems: "center",
    gap: 10,
  };
  const labelDot: React.CSSProperties = {
    width: 8,
    height: 8,
    borderRadius: 4,
    background: "var(--v2-accent)",
  };

  return (
    <section className="v2-section" style={{ paddingTop: 0 }}>
      <div className="v2-container">
        <div className="v2-index-head">
          <div>
            <div className="v2-eyebrow">Plans</div>
            <h2 className="v2-h2" style={{ marginTop: 16 }}>
              Plans for both <em>sides</em> of the network.
            </h2>
          </div>
        </div>

        {/* For Job Seekers */}
        <div style={{ marginTop: 40 }}>
          <div style={sectionLabelStyle}>
            <span style={labelDot} />
            For Job Seekers
          </div>
          <div className="v2-plans">
            <div className="v2-plan">
              <h4>Free</h4>
              <div className="v2-plan-price">Free</div>
              <div className="v2-plan-period">always</div>
              <ul>
                <li>Unlimited applications</li>
                <li>Full profile + certifications</li>
                <li>Browse every role with all filters</li>
                <li>Email alerts for new matches</li>
              </ul>
              <PlanCardButton cta={ctaJsFree} />
            </div>
            <div className="v2-plan featured">
              <div className="v2-plan-tag">Most popular</div>
              <h4>{gold.label}</h4>
              <div className="v2-plan-price">
                {fmtPrice(gold.priceCents)}
                <span style={{ fontSize: 14, fontWeight: 400 }}> / mo</span>
              </div>
              <div className="v2-plan-period">cancel anytime</div>
              <ul>
                <li>Featured profile — top of every employer search</li>
                <li>AI match scoring on every role</li>
                <li>AI cover-letter generator</li>
                <li>AI profile polish</li>
                <li>Application insights — see who opened your application</li>
              </ul>
              <PlanCardButton cta={ctaJsGold} />
            </div>
            <div className="v2-plan">
              <h4>{platinum.label}</h4>
              <div className="v2-plan-price">
                {fmtPrice(platinum.priceCents)}
                <span style={{ fontSize: 14, fontWeight: 400 }}> / mo</span>
              </div>
              <div className="v2-plan-period">cancel anytime</div>
              <ul>
                <li>Everything in Gold</li>
                <li>Cert expiry warnings in your profile</li>
                <li>Trainings library</li>
                <li>Cert prep & practice tests (coming soon)</li>
              </ul>
              <PlanCardButton cta={ctaJsPlatinum} />
            </div>
          </div>
        </div>

        {/* For Employers */}
        <div style={{ marginTop: 56 }}>
          <div style={sectionLabelStyle}>
            <span style={labelDot} />
            For Employers
          </div>
          <div className="v2-plans">
            <div className="v2-plan">
              <h4>{a.label}</h4>
              <div className="v2-plan-price">
                {fmtPrice(a.priceCents)}
                <span style={{ fontSize: 14, fontWeight: 400 }}> / mo</span>
              </div>
              <div className="v2-plan-period">monthly · cancel anytime</div>
              <ul>
                <li>{a.jobsPerCycle} active job posting · {a.seats} recruiter seat</li>
                <li>Full applicant pipeline + emails</li>
                <li>Branded company profile</li>
                <li>Screening questions + standard placement</li>
              </ul>
              <PlanCardButton cta={ctaEmpA} />
            </div>
            <div className="v2-plan featured">
              <div className="v2-plan-tag">Most popular</div>
              <h4>{b.label}</h4>
              <div className="v2-plan-price">
                {fmtPrice(b.priceCents)}
                <span style={{ fontSize: 14, fontWeight: 400 }}> / mo</span>
              </div>
              <div className="v2-plan-period">monthly · cancel anytime</div>
              <ul>
                <li>{b.jobsPerCycle} active postings · {b.seats} recruiter seats</li>
                <li>1 featured slot per cycle</li>
                <li>Basic hiring analytics</li>
                <li>Enhanced company profile</li>
              </ul>
              <PlanCardButton cta={ctaEmpB} />
            </div>
            <div className="v2-plan">
              <h4>{c.label}</h4>
              <div className="v2-plan-price">
                {fmtPrice(c.priceCents)}
                <span style={{ fontSize: 14, fontWeight: 400 }}> / mo</span>
              </div>
              <div className="v2-plan-period">for scaling teams</div>
              <ul>
                <li>{c.jobsPerCycle} active postings · {c.seats} recruiter seats</li>
                <li>3 featured slots · priority placement</li>
                <li>Advanced analytics + premium profile</li>
                <li>Priority support</li>
              </ul>
              <PlanCardButton cta={ctaEmpC} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- final CTA ---------- */

function FinalCta() {
  return (
    <section className="v2-cta-band">
      <div className="v2-container-narrow" style={{ textAlign: "center" }}>
        <div
          className="v2-eyebrow v2-eyebrow-light"
          style={{ justifyContent: "center", display: "inline-flex" }}
        >
          Ready when you are
        </div>
        <h2
          className="v2-h2"
          style={{ marginTop: 20, fontSize: "clamp(44px, 7vw, 88px)" }}
        >
          Your next role is
          <br />
          <em style={{ fontStyle: "italic" }}>waiting</em> to be matched.
        </h2>
        <div className="v2-cta-actions" style={{ justifyContent: "center" }}>
          <Link href="/sign-up" className="v2-btn v2-btn-accent v2-btn-lg">
            Create your profile <Icon name="arrowUpRight" size={18} />
          </Link>
          <Link href="/jobs" className="v2-btn v2-btn-invert v2-btn-lg">
            Browse jobs first
          </Link>
        </div>
      </div>
    </section>
  );
}
