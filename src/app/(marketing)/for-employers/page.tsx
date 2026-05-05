import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/marketing/site-header";
import { Icon } from "@/components/shared/icon";
import { PricingSection, RoiCalculator } from "./employers-interactive";

export const metadata: Metadata = {
  title: "For employers — hire Canadian energy specialists",
  description:
    "AI-ranked shortlists of Canadian energy professionals — controls, instrumentation, wind, solar, nuclear, hydrogen — sourced from active members and a 47k passive talent network.",
  alternates: { canonical: "/for-employers" },
};

const TRUST_LOGOS = [
  { nm: "Ark Energy", mk: "AE", c: "var(--v2-accent)" },
  { nm: "BrightGrid", mk: "BG", c: "var(--v2-accent-deep)" },
  { nm: "NorthStar Renewables", mk: "NS", c: "var(--v2-ink-950)" },
  { nm: "CanFlow Pipeline", mk: "CF", c: "var(--v2-lilac)" },
  { nm: "Helios Solar", mk: "HS", c: "var(--v2-coral)" },
  { nm: "Aurora Wind", mk: "AW", c: "var(--v2-sky)" },
];

const FLOW = [
  {
    n: "01",
    t: "Post a role",
    d: "Use our energy-aware templates or paste your existing JD. The AI flags vague requirements and asks the questions a senior recruiter would.",
    time: "8 minutes",
  },
  {
    n: "02",
    t: "AI builds a shortlist",
    d: "25 ranked candidates with rationale, sourced from active members and our passive talent network. Each match comes with three flagged interview questions.",
    time: "Within 48h",
  },
  {
    n: "03",
    t: "Interview the right ones",
    d: "Schedule, video-interview, score, and discuss as a hiring panel — all without leaving the platform. Or sync to your ATS and stay where you live.",
    time: "Days, not weeks",
  },
  {
    n: "04",
    t: "Hire & onboard",
    d: "Structured offers, e-sign, reference checks, and onboarding checklists. We hand off cleanly — including DEI funnel data for your board.",
    time: "Closed loop",
  },
];

const ATS = [
  { nm: "Greenhouse", stat: "Native", mk: "GH", c: "#249F58" },
  { nm: "Lever", stat: "Native", mk: "LV", c: "#FF7A59" },
  { nm: "Workday", stat: "Deep map", mk: "WD", c: "#0875E1" },
  { nm: "SmartRecruiters", stat: "API", mk: "SR", c: "#0095D5" },
  { nm: "BambooHR", stat: "API", mk: "BB", c: "#73C41D" },
  { nm: "Eightfold", stat: "API", mk: "EF", c: "#1A1F36" },
  { nm: "Ashby", stat: "Native", mk: "AB", c: "#FF5A1F" },
  { nm: "Custom", stat: "Webhook", mk: "+", c: "var(--v2-ink-950)" },
];

const FAQ = [
  {
    q: "How is Energized different from a standard job board?",
    a: "We're a sourcing engine, not a posting board. We actively rank and surface candidates from a vetted Canadian energy talent pool — and most of our placements come from passive candidates who never applied directly to the role.",
  },
  {
    q: "What if my company is not in Canada?",
    a: "We focus on Canadian energy hiring — that's where our match data is sharpest. We do support cross-border roles where the employer has a Canadian entity and FIFO international rotations from Canadian airports.",
  },
  {
    q: "Do you charge per hire or per posting?",
    a: "No. Flat monthly or annual fees, period. No surprise success fees, no per-applicant cost, no auto-upgrade traps. The price you sign for is the price you pay for the term.",
  },
  {
    q: "How long does ATS integration take?",
    a: "Greenhouse, Lever, and Ashby are click-to-connect (under 5 minutes). Workday is a 30-minute call with one of our integration engineers — we handle field mapping, EEO codes, and structured offer formats.",
  },
  {
    q: "Can I hire contract or rotation roles, not just full-time?",
    a: "Yes — full-time, fixed-term, FIFO rotations, and contract are all first-class on Energized. We surface candidates with the rotation tolerance and travel availability you need.",
  },
  {
    q: "What kind of DEI reporting do you provide?",
    a: "Funnel demographics by stage, time-to-hire by group, offer acceptance rates, and 90-day retention. Privacy-first defaults — candidates always control what they share, and aggregate reports require minimum cohort sizes.",
  },
];

const SHORTLIST = [
  { nm: "Maya Reyes", ti: "Controls Eng · 8y · Honeywell DCS", match: 96, c: "var(--v2-sky)", i: "MR", peng: true, gwo: true },
  { nm: "Karim Diallo", ti: "Sr. Automation · 11y · Emerson", match: 93, c: "var(--v2-accent-deep)", i: "KD", peng: true, gwo: false },
  { nm: "Hana Park", ti: "Process Controls · 6y · Yokogawa", match: 91, c: "var(--v2-coral)", i: "HP", peng: true, gwo: false },
  { nm: "Daniel Okafor", ti: "SCADA Lead · 9y · Multi-DCS", match: 88, c: "var(--v2-lilac)", i: "DO", peng: false, gwo: true },
];

const COMPLIANCE = ["PIPEDA", "SOC 2 II", "ISO 27001", "SAML SSO", "SCIM", "GDPR-ready"];

const TIME_BARS = [18, 22, 16, 19, 15, 21, 17, 14, 18, 20, 16, 18, 15, 19];
const PIPELINE_BARS = [40, 55, 70, 52, 68, 45];

export default function ForEmployersPage() {
  return (
    <>
      <SiteHeader active="employers" />
      <main className="v2-emp" style={{ flex: 1 }}>
        <Hero />
        <LogoStrip />
        <HowItWorks />
        <FeatureBento />
        <Testimonial />
        <PricingSection />
        <RoiCalculator />
        <Faq />
        <ClosingCta />
      </main>
    </>
  );
}

/* ---------- hero ---------- */

function Hero() {
  return (
    <section className="v2-emp-hero">
      <div className="v2-container">
        <div className="v2-emp-hero-grid">
          <div>
            <div className="v2-eyebrow">
              For employers · Hiring for Canada&rsquo;s energy transition
            </div>
            <h1 className="v2-emp-hero-h">
              Hire the <em>specialist</em>
              <br />
              who <span className="pill">already exists</span>.
            </h1>
            <p className="v2-emp-hero-sub">
              Posting a job to a board and hoping is over. Tell us the role,
              and within 48 hours you&rsquo;ll have 25 ranked candidates with
              rationale &mdash; sourced from active members{" "}
              <em style={{ fontStyle: "italic", color: "var(--v2-ink-950)" }}>
                and
              </em>{" "}
              our passive talent network of 47k vetted Canadian energy
              professionals.
            </p>
            <div className="v2-emp-hero-actions">
              <Link
                href="/contact?topic=demo"
                className="v2-btn v2-btn-primary v2-btn-lg"
              >
                Book a 20-min demo
                <Icon name="arrowRight" size={18} />
              </Link>
              <Link
                href="/sign-up?role=employer"
                className="v2-btn v2-btn-ghost v2-btn-lg"
              >
                Post your first role free
              </Link>
            </div>
            <div className="v2-emp-hero-trust">
              <div className="v2-emp-hero-trust-stack" aria-hidden="true">
                <span style={{ background: "var(--v2-accent)" }}>AE</span>
                <span style={{ background: "var(--v2-accent-deep)" }}>NS</span>
                <span style={{ background: "var(--v2-lilac)" }}>CF</span>
                <span style={{ background: "var(--v2-coral)" }}>AW</span>
                <span
                  style={{
                    background: "var(--v2-ink-950)",
                    color: "var(--v2-accent)",
                    fontFamily: "var(--v2-font-mono)",
                  }}
                >
                  +1.2k
                </span>
              </div>
              <div className="v2-emp-hero-trust-text">
                <strong>1,200 hiring teams</strong> across Canadian energy
              </div>
            </div>
          </div>
          <HeroShortlist />
        </div>
      </div>
    </section>
  );
}

function HeroShortlist() {
  return (
    <div className="v2-emp-shortlist" aria-label="Sample shortlist preview">
      <div className="v2-emp-shortlist-head">
        <div>
          <div className="v2-emp-shortlist-meta">
            SHORTLIST · SR. CONTROLS ENG · CALGARY
          </div>
          <div className="v2-emp-shortlist-title">25 ranked matches</div>
        </div>
        <div
          className="v2-emp-shortlist-meta"
          style={{ textAlign: "right" }}
        >
          <div>Generated</div>
          <div
            style={{
              color: "var(--v2-ink-950)",
              fontWeight: 700,
              marginTop: 2,
            }}
          >
            2h 14m ago
          </div>
        </div>
      </div>

      {SHORTLIST.map((p) => (
        <div key={p.nm} className="v2-emp-shortlist-row">
          <div className="av" style={{ background: p.c }}>
            {p.i}
          </div>
          <div>
            <div className="nm">{p.nm}</div>
            <div className="ti">{p.ti}</div>
          </div>
          <div className="badges">
            {p.peng && <span className="badge peng">P.Eng</span>}
            {p.gwo && <span className="badge gwo">GWO</span>}
          </div>
          <div className="match">
            <em>{p.match}</em>
            <span
              style={{
                fontFamily: "var(--v2-font-mono)",
                fontSize: 10,
                color: "var(--v2-ink-400)",
              }}
            >
              %
            </span>
          </div>
        </div>
      ))}

      <div className="v2-emp-shortlist-foot">
        <div className="ic">
          <Icon name="zap" size={16} />
        </div>
        <div>
          <div className="t1">21 more ranked candidates ready</div>
          <div className="t2">
            Why ranked? Each carries 3 interview questions auto-drafted from CV
            gaps.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- logo strip ---------- */

function LogoStrip() {
  return (
    <section className="v2-emp-logos" aria-label="Customer logos">
      <div className="v2-container">
        <div className="v2-emp-logos-inner">
          <div className="v2-emp-logos-label">
            Trusted by Canadian energy hiring teams
          </div>
          <div className="v2-emp-logos-list">
            {TRUST_LOGOS.map((l) => (
              <span key={l.nm} className="v2-emp-logo">
                <span className="mk" style={{ background: l.c }}>
                  {l.mk}
                </span>
                {l.nm}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- how it works ---------- */

function HowItWorks() {
  return (
    <section className="v2-emp-sec">
      <div className="v2-container">
        <div className="v2-emp-sec-head">
          <div>
            <div className="v2-eyebrow">How it works</div>
            <h2 className="v2-emp-sec-h" style={{ marginTop: 16 }}>
              From job spec to <em>signed offer</em>,
              <br />
              without the noise.
            </h2>
          </div>
          <p className="v2-emp-sec-lede">
            Most of our customers move from kick-off to first interview in
            under a week. Here&rsquo;s the four-step shape of it.
          </p>
        </div>

        <div className="v2-emp-flow">
          {FLOW.map((s) => (
            <div key={s.n} className="v2-emp-flow-step">
              <span className="v2-emp-flow-num">STEP / {s.n}</span>
              <h3 className="v2-emp-flow-h">{s.t}</h3>
              <p className="v2-emp-flow-d">{s.d}</p>
              <span className="v2-emp-flow-time">
                <span className="dot" />
                {s.time}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- feature bento ---------- */

function FeatureBento() {
  return (
    <section className="v2-emp-sec sand">
      <div className="v2-container">
        <div className="v2-emp-sec-head">
          <div>
            <div className="v2-eyebrow">What you get</div>
            <h2 className="v2-emp-sec-h" style={{ marginTop: 16 }}>
              Built for the cuts that <em>actually</em> narrow a shortlist.
            </h2>
          </div>
          <p className="v2-emp-sec-lede">
            Standard ATS filters can&rsquo;t tell a senior controls engineer
            from someone who once name-dropped DCS in a CV. Ours can.
          </p>
        </div>

        <div className="v2-emp-feat-grid">
          {/* row 1 */}
          <div className="v2-emp-feat span-3">
            <span className="v2-emp-feat-eye">AI matching</span>
            <h3 className="v2-emp-feat-h">
              25 <em>ranked</em> candidates with rationale, in 48 hours.
            </h3>
            <p className="v2-emp-feat-d">
              Our match engine reads project depth, certification depth, and
              rotation tolerance &mdash; not just keywords. Each result comes
              with three interview questions drafted to probe its weakest
              dimension.
            </p>
            <div className="v2-emp-feat-art">
              <div className="v2-emp-funnel">
                <div className="v2-emp-funnel-bar b1">
                  <div className="num">2,841</div>
                  <div className="lab">Eligible pool</div>
                </div>
                <div className="v2-emp-funnel-bar b2">
                  <div className="num">412</div>
                  <div className="lab">Skill match</div>
                </div>
                <div className="v2-emp-funnel-bar b3">
                  <div className="num">88</div>
                  <div className="lab">Sector fluent</div>
                </div>
                <div className="v2-emp-funnel-bar b4">
                  <div className="num">25</div>
                  <div className="lab">Shortlist</div>
                </div>
                <div className="v2-emp-funnel-bar b5">
                  <div className="num">5</div>
                  <div className="lab">Hired (avg)</div>
                </div>
              </div>
            </div>
          </div>

          <div className="v2-emp-feat span-3 dark">
            <span className="v2-emp-feat-eye">Energy-aware filters</span>
            <h3 className="v2-emp-feat-h">
              Filter by the cuts that <em>matter</em>.
            </h3>
            <p className="v2-emp-feat-d">
              P.Eng province, GWO level, NCSO, DCS platform, rotation
              tolerance, language, and field clearance &mdash; all first-class
              filters, not buried in a &ldquo;free text&rdquo; search.
            </p>
            <div className="v2-emp-feat-art">
              <div className="v2-emp-filters">
                <span className="v2-emp-filter-chip active">
                  P.Eng · AB
                  <span className="x">
                    <Icon name="x" size={8} />
                  </span>
                </span>
                <span className="v2-emp-filter-chip active">
                  GWO · BST
                  <span className="x">
                    <Icon name="x" size={8} />
                  </span>
                </span>
                <span className="v2-emp-filter-chip active">
                  Honeywell DCS
                  <span className="x">
                    <Icon name="x" size={8} />
                  </span>
                </span>
                <span className="v2-emp-filter-chip">14/14 rotation</span>
                <span className="v2-emp-filter-chip">Bilingual EN/FR</span>
                <span className="v2-emp-filter-chip">+ 18 more</span>
              </div>
              <div
                style={{
                  marginTop: 20,
                  fontSize: 13,
                  color: "var(--v2-ink-300)",
                  fontFamily: "var(--v2-font-mono)",
                  fontWeight: 700,
                }}
              >
                <span style={{ color: "var(--v2-accent)", fontWeight: 700 }}>
                  88 matches
                </span>{" "}
                · narrowed from 2,841 in 12 ms
              </div>
            </div>
          </div>

          {/* row 2 */}
          <div className="v2-emp-feat span-2 accent">
            <span className="v2-emp-feat-eye">Time to hire</span>
            <div className="v2-emp-bigstat" style={{ marginTop: 18 }}>
              <em>18</em>d
            </div>
            <p className="v2-emp-bigstat-sub">
              vs. 47-day Canadian average across all sectors
            </p>
            <div className="v2-emp-feat-art">
              <div className="v2-emp-mini-bars" aria-hidden="true">
                {TIME_BARS.map((h, i) => (
                  <div
                    key={i}
                    className="b f"
                    style={{
                      height: h * 2 + "%",
                      minHeight: 6,
                    }}
                  />
                ))}
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontFamily: "var(--v2-font-mono)",
                  fontWeight: 700,
                  fontSize: 10,
                  color: "var(--v2-ink-700)",
                  letterSpacing: "0.05em",
                }}
              >
                TIME-TO-HIRE · LAST 14 PLACEMENTS
              </div>
            </div>
          </div>

          <div className="v2-emp-feat span-2">
            <span className="v2-emp-feat-eye">Sourced from</span>
            <h3 className="v2-emp-feat-h">
              Active <em>and</em> passive talent.
            </h3>
            <p className="v2-emp-feat-d">
              Most placements come from passive candidates who never opened a
              job board. We surface them anyway.
            </p>
            <div className="v2-emp-feat-art">
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontFamily: "var(--v2-font-serif)",
                      fontWeight: 900,
                      fontSize: 36,
                      letterSpacing: "-0.025em",
                      color: "var(--v2-ink-950)",
                    }}
                  >
                    72
                    <span style={{ fontSize: 18, color: "var(--v2-ink-500)" }}>
                      %
                    </span>
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--v2-font-mono)",
                      fontWeight: 700,
                      fontSize: 10,
                      color: "var(--v2-ink-500)",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      marginTop: 4,
                    }}
                  >
                    Passive
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontFamily: "var(--v2-font-serif)",
                      fontWeight: 900,
                      fontSize: 36,
                      letterSpacing: "-0.025em",
                      color: "var(--v2-ink-950)",
                    }}
                  >
                    28
                    <span style={{ fontSize: 18, color: "var(--v2-ink-500)" }}>
                      %
                    </span>
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--v2-font-mono)",
                      fontWeight: 700,
                      fontSize: 10,
                      color: "var(--v2-ink-500)",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      marginTop: 4,
                    }}
                  >
                    Active
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="v2-emp-feat span-2">
            <span className="v2-emp-feat-eye">Diversity &amp; DEI</span>
            <h3 className="v2-emp-feat-h">
              Real <em>numbers</em> for real boards.
            </h3>
            <p className="v2-emp-feat-d">
              Funnel demographics by stage, offer acceptance by group, 90-day
              retention. Privacy-first defaults &mdash; candidates control what
              they share.
            </p>
            <div className="v2-emp-feat-art">
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  alignItems: "end",
                  height: 60,
                }}
              >
                {PIPELINE_BARS.map((h, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: h + "%",
                      background:
                        i % 2
                          ? "var(--v2-ink-950)"
                          : "var(--v2-accent-deep)",
                      borderRadius: 2,
                    }}
                  />
                ))}
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontFamily: "var(--v2-font-mono)",
                  fontWeight: 700,
                  fontSize: 10,
                  color: "var(--v2-ink-500)",
                  letterSpacing: "0.05em",
                }}
              >
                PIPELINE PARITY · Q1 2026
              </div>
            </div>
          </div>

          {/* row 3 */}
          <div className="v2-emp-feat span-3">
            <span className="v2-emp-feat-eye">ATS integrations</span>
            <h3 className="v2-emp-feat-h">
              Wires into the system <em>your team already uses</em>.
            </h3>
            <p className="v2-emp-feat-d">
              Native, deep mapping for the platforms your hiring team already
              lives in. Or take it raw via our public API.
            </p>
            <div className="v2-emp-feat-art">
              <div className="v2-emp-ats-grid">
                {ATS.map((a) => (
                  <div key={a.nm} className="v2-emp-ats-tile">
                    <div className="mk" style={{ background: a.c }}>
                      {a.mk}
                    </div>
                    <div className="nm">{a.nm}</div>
                    <div className="stat">{a.stat}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="v2-emp-feat span-3 dark">
            <span className="v2-emp-feat-eye">Compliance &amp; security</span>
            <h3 className="v2-emp-feat-h">
              Canadian <em>data residency</em>, by default.
            </h3>
            <p className="v2-emp-feat-d">
              All data stored in AWS ca-central-1 with DR in ca-west-1.
              PIPEDA-compliant, SOC 2 Type II, SAML SSO, SCIM provisioning, and
              audit-grade logging. Right-to-be-forgotten honored within 14
              days.
            </p>
            <div className="v2-emp-feat-art">
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {COMPLIANCE.map((b) => (
                  <span key={b} className="v2-emp-comp-pill">
                    {b}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- testimonial ---------- */

function Testimonial() {
  return (
    <section className="v2-emp-sec dark">
      <div className="v2-container">
        <div className="v2-emp-quote">
          <div>
            <div className="v2-emp-quote-mark" aria-hidden="true">
              &ldquo;
            </div>
            <div
              className="v2-emp-quote-text"
              style={{ color: "white", marginTop: -20 }}
            >
              We filled 14 controls and instrumentation seats in{" "}
              <em>nine weeks</em>. Our last agency push took six months
              &mdash; and missed the mark on three roles.
            </div>
            <div className="v2-emp-quote-attr">
              <div
                className="v2-emp-quote-av"
                style={{ background: "var(--v2-coral)" }}
              >
                PA
              </div>
              <div>
                <div className="v2-emp-quote-name">Priya Anand</div>
                <div className="v2-emp-quote-role">
                  VP Talent · Ark Energy Inc.
                </div>
              </div>
            </div>
          </div>

          <div className="v2-emp-quote-stats">
            <div className="v2-emp-quote-stat">
              <div className="n">
                <em>14</em> hires
              </div>
              <div className="l">Controls + I&amp;C</div>
              <div className="s">
                Across Calgary, Edmonton, Fort Mac field offices.
              </div>
            </div>
            <div className="v2-emp-quote-stat">
              <div className="n">9 wks</div>
              <div className="l">Kick-off to last offer</div>
              <div className="s">vs. 6-month prior cycle, $640k saved.</div>
            </div>
            <div className="v2-emp-quote-stat">
              <div className="n">
                <em>96</em>%
              </div>
              <div className="l">90-day retention</div>
              <div className="s">All 14 still in seat at quarterly check-in.</div>
            </div>
            <div className="v2-emp-quote-stat">
              <div className="n">3.4&times;</div>
              <div className="l">Sourcing ROI</div>
              <div className="s">
                Energized + 1 internal recruiter &gt; 4 agency desks.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- FAQ ---------- */

function Faq() {
  return (
    <section className="v2-emp-sec">
      <div className="v2-container">
        <div className="v2-emp-sec-head">
          <div>
            <div className="v2-eyebrow">Common questions</div>
            <h2 className="v2-emp-sec-h" style={{ marginTop: 16 }}>
              Things you probably want to <em>know</em>.
            </h2>
          </div>
          <p className="v2-emp-sec-lede">
            Anything missing? Our team responds to inbound in under four
            business hours &mdash;{" "}
            <Link
              href="/contact"
              style={{
                textDecoration: "underline",
                color: "var(--v2-ink-950)",
              }}
            >
              send us a question
            </Link>
            .
          </p>
        </div>

        <div className="v2-emp-faq">
          {FAQ.map((f) => (
            <div key={f.q} className="v2-emp-faq-q">
              <h4>{f.q}</h4>
              <p>{f.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- closing CTA ---------- */

function ClosingCta() {
  return (
    <section className="v2-emp-cta">
      <div className="v2-container">
        <div className="v2-emp-cta-eye">Ready when you are</div>
        <h2 className="v2-emp-cta-h">
          Stop posting.
          <br />
          Start <em>hiring</em>.
        </h2>
        <p className="v2-emp-cta-sub">
          20-minute demo. No deck. We&rsquo;ll plug in one of your real open
          roles and show you a live shortlist by the end of the call.
        </p>
        <div className="v2-emp-cta-actions">
          <Link
            href="/contact?topic=demo"
            className="v2-btn v2-btn-accent v2-btn-lg"
          >
            Book a demo
            <Icon name="arrowRight" size={18} />
          </Link>
          <Link
            href="/sign-up?role=employer"
            className="v2-btn v2-btn-invert v2-btn-lg"
          >
            Post a role free
          </Link>
        </div>
      </div>
    </section>
  );
}
