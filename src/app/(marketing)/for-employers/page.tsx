import Link from "next/link";
import type { Metadata } from "next";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  applications,
  certifications,
  employerOrgs,
  jobListings,
  user,
} from "@/server/db/schema";
import { SiteHeader } from "@/components/marketing/site-header";
import { Icon } from "@/components/shared/icon";
import { SECTOR_LABELS, type JobSector } from "@/lib/jobs-options";
import { PricingSection, RoiCalculator } from "./employers-interactive";

export const metadata: Metadata = {
  title: "For employers — hire Canadian energy specialists",
  description:
    "AI-ranked shortlists of Canadian energy professionals — oil & gas, renewables, nuclear, utilities, hydrogen, power. Built for Canadian energy hiring teams.",
  alternates: { canonical: "/for-employers" },
};

const SECTOR_ORDER: JobSector[] = [
  "oil_gas",
  "renewables",
  "nuclear",
  "utilities",
  "hydrogen",
  "power",
];

const SECTOR_THEMES: Record<JobSector, { mk: string; c: string }> = {
  oil_gas: { mk: "OG", c: "var(--v2-ink-950)" },
  renewables: { mk: "RN", c: "var(--v2-accent)" },
  nuclear: { mk: "NU", c: "var(--v2-lilac)" },
  utilities: { mk: "UT", c: "var(--v2-sky)" },
  hydrogen: { mk: "HY", c: "var(--v2-accent-deep)" },
  power: { mk: "PW", c: "var(--v2-coral)" },
  other: { mk: "—", c: "#666" },
};

const FLOW = [
  {
    n: "01",
    t: "Post a role",
    d: "Use our energy-aware templates or paste your existing JD. We capture sector, certifications required, salary band, work setup, and experience level as first-class fields.",
    time: "8 minutes",
  },
  {
    n: "02",
    t: "AI builds a shortlist",
    d: "Ranked candidates with plain-English rationale, sourced from active members of the Energized network. Match logic reads project depth, certifications on file, and sector fluency.",
    time: "Within 48h",
  },
  {
    n: "03",
    t: "Interview the right ones",
    d: "Schedule interviews, score candidates, and discuss as a hiring panel — all on the platform. Send intro requests to passive candidates with one click.",
    time: "Days, not weeks",
  },
  {
    n: "04",
    t: "Hire & track",
    d: "Move candidates through your pipeline kanban — submitted, reviewed, interview, offer, hired. Stripe-managed billing, transparent application history.",
    time: "Closed loop",
  },
];

const ILLUSTRATIVE_SHORTLIST: {
  nm: string;
  ti: string;
  match: number;
  c: string;
  i: string;
  peng: boolean;
  gwo: boolean;
}[] = [
  {
    nm: "Maya Reyes",
    ti: "Controls Eng · 8y · Honeywell DCS",
    match: 96,
    c: "var(--v2-sky)",
    i: "MR",
    peng: true,
    gwo: true,
  },
  {
    nm: "Karim Diallo",
    ti: "Sr. Automation · 11y · Emerson",
    match: 93,
    c: "var(--v2-accent-deep)",
    i: "KD",
    peng: true,
    gwo: false,
  },
  {
    nm: "Hana Park",
    ti: "Process Controls · 6y · Yokogawa",
    match: 91,
    c: "var(--v2-coral)",
    i: "HP",
    peng: true,
    gwo: false,
  },
  {
    nm: "Daniel Okafor",
    ti: "SCADA Lead · 9y · Multi-DCS",
    match: 88,
    c: "var(--v2-lilac)",
    i: "DO",
    peng: false,
    gwo: true,
  },
];

const ILLUSTRATIVE_TIME_BARS = [18, 22, 16, 19, 15, 21, 17, 14, 18, 20, 16, 18, 15, 19];
const ILLUSTRATIVE_PIPELINE_BARS = [40, 55, 70, 52, 68, 45];

const FAQ = [
  {
    q: "How is Energized different from a standard job board?",
    a: "We're a sector-specific sourcing engine, not a generalist posting board. We rank and surface candidates by their actual energy-sector experience — projects, certifications, the systems they've run — rather than by keyword density on a CV.",
  },
  {
    q: "What if my company is not in Canada?",
    a: "We focus on Canadian energy hiring — that's where our matching is sharpest. We support cross-border roles where the employer has a Canadian entity and FIFO rotations from Canadian airports.",
  },
  {
    q: "Do you charge per hire or per posting?",
    a: "No. Flat monthly or annual fees, period. No surprise success fees, no per-applicant cost. The price you sign for is the price you pay for the term.",
  },
  {
    q: "Can I hire contract or rotation roles, not just full-time?",
    a: "Yes — full-time, fixed-term, FIFO rotations, and contract are all first-class on Energized. Filter your shortlist by rotation tolerance, work setup, and experience level.",
  },
  {
    q: "What candidate data do you collect?",
    a: "Profile, work history, certifications (with expiry and credential ID), and applications. Candidates control what they share with each employer; resumes and certification documents are stored on Canadian-aware infrastructure.",
  },
];

export default async function ForEmployersPage() {
  const [
    [{ n: liveRoles } = { n: 0 }],
    [{ n: candidateCount } = { n: 0 }],
    [{ n: employerCount } = { n: 0 }],
    [{ n: applicationCount } = { n: 0 }],
    [{ n: certCount } = { n: 0 }],
    sectorRows,
  ] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(jobListings)
      .where(eq(jobListings.status, "published")),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(user)
      .where(eq(user.role, "jobseeker")),
    db.select({ n: sql<number>`count(*)::int` }).from(employerOrgs),
    db.select({ n: sql<number>`count(*)::int` }).from(applications),
    db.select({ n: sql<number>`count(*)::int` }).from(certifications),
    db
      .select({
        sector: jobListings.sector,
        n: sql<number>`count(*)::int`,
      })
      .from(jobListings)
      .where(eq(jobListings.status, "published"))
      .groupBy(jobListings.sector),
  ]);

  const sectorCountMap = new Map<JobSector, number>();
  for (const row of sectorRows) {
    sectorCountMap.set(row.sector as JobSector, row.n);
  }
  const sectorList = SECTOR_ORDER.map((s) => ({
    enum: s,
    label: SECTOR_LABELS[s],
    count: sectorCountMap.get(s) ?? 0,
    theme: SECTOR_THEMES[s],
  }));

  return (
    <>
      <SiteHeader active="employers" />
      <main className="v2-emp" style={{ flex: 1 }}>
        <Hero candidateCount={candidateCount} employerCount={employerCount} />
        <LogoStrip sectorList={sectorList} />
        <HowItWorks />
        <FeatureBento
          liveRoles={liveRoles}
          candidateCount={candidateCount}
          applicationCount={applicationCount}
          certCount={certCount}
          sectorList={sectorList}
        />
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

function Hero({
  candidateCount,
  employerCount,
}: {
  candidateCount: number;
  employerCount: number;
}) {
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
              and we&rsquo;ll surface ranked candidates with plain-English
              rationale &mdash; drawn from our growing network of vetted
              Canadian energy professionals.
            </p>
            <div className="v2-emp-hero-actions">
              <Link
                href="/sign-up?role=employer"
                className="v2-btn v2-btn-primary v2-btn-lg"
              >
                Post your first role free
                <Icon name="arrowRight" size={18} />
              </Link>
              <Link
                href="/contact"
                className="v2-btn v2-btn-ghost v2-btn-lg"
              >
                Talk to us
              </Link>
            </div>
            <div className="v2-emp-hero-trust">
              <div className="v2-emp-hero-trust-stack" aria-hidden="true">
                {SECTOR_ORDER.slice(0, 4).map((s) => (
                  <span
                    key={s}
                    style={{ background: SECTOR_THEMES[s].c }}
                  >
                    {SECTOR_THEMES[s].mk}
                  </span>
                ))}
                <span
                  style={{
                    background: "var(--v2-ink-950)",
                    color: "var(--v2-accent)",
                    fontFamily: "var(--v2-font-mono)",
                  }}
                >
                  +{Math.max(0, SECTOR_ORDER.length - 4)}
                </span>
              </div>
              <div className="v2-emp-hero-trust-text">
                <strong>
                  {candidateCount}{" "}
                  {candidateCount === 1
                    ? "energy professional"
                    : "energy professionals"}
                </strong>{" "}
                · {employerCount}{" "}
                {employerCount === 1 ? "employer" : "employers"} hiring
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
    <div
      className="v2-emp-shortlist"
      aria-label="Illustrative shortlist preview"
    >
      <div className="v2-emp-shortlist-head">
        <div>
          <div className="v2-emp-shortlist-meta">
            EXAMPLE SHORTLIST · ILLUSTRATIVE
          </div>
          <div className="v2-emp-shortlist-title">Ranked match preview</div>
        </div>
        <div
          className="v2-emp-shortlist-meta"
          style={{ textAlign: "right" }}
        >
          <div>Sample data</div>
          <div
            style={{
              color: "var(--v2-ink-950)",
              fontWeight: 700,
              marginTop: 2,
            }}
          >
            Not real candidates
          </div>
        </div>
      </div>

      {ILLUSTRATIVE_SHORTLIST.map((p) => (
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
          <div className="t1">Live shortlists arrive within 48 hours</div>
          <div className="t2">
            Each match carries a plain-English rationale &mdash; what aligns,
            what doesn&rsquo;t, what to probe in the interview.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- logo strip ---------- */

function LogoStrip({
  sectorList,
}: {
  sectorList: {
    enum: JobSector;
    label: string;
    count: number;
    theme: { mk: string; c: string };
  }[];
}) {
  return (
    <section className="v2-emp-logos" aria-label="Energy sectors covered">
      <div className="v2-container">
        <div className="v2-emp-logos-inner">
          <div className="v2-emp-logos-label">
            Built for every corner of Canadian energy
          </div>
          <div className="v2-emp-logos-list">
            {sectorList.map((s) => (
              <span key={s.enum} className="v2-emp-logo">
                <span className="mk" style={{ background: s.theme.c }}>
                  {s.theme.mk}
                </span>
                {s.label}
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

function FeatureBento({
  liveRoles,
  candidateCount,
  applicationCount,
  certCount,
  sectorList,
}: {
  liveRoles: number;
  candidateCount: number;
  applicationCount: number;
  certCount: number;
  sectorList: {
    enum: JobSector;
    label: string;
    count: number;
    theme: { mk: string; c: string };
  }[];
}) {
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
            Generalist filters can&rsquo;t tell a senior controls engineer
            from someone who once name-dropped DCS in a CV. Ours can.
          </p>
        </div>

        <div className="v2-emp-feat-grid">
          {/* row 1 */}
          <div className="v2-emp-feat span-3">
            <span className="v2-emp-feat-eye">AI matching</span>
            <h3 className="v2-emp-feat-h">
              <em>Ranked</em> candidates with plain-English rationale.
            </h3>
            <p className="v2-emp-feat-d">
              Our match engine reads project depth, certification depth, and
              sector fluency &mdash; not just keywords. Every match arrives
              with a written rationale: what aligns, what doesn&rsquo;t, what
              to probe in the interview.
            </p>
            <div className="v2-emp-feat-art">
              <div className="v2-emp-funnel">
                <div className="v2-emp-funnel-bar b1">
                  <div className="num">{candidateCount}</div>
                  <div className="lab">Eligible pool</div>
                </div>
                <div className="v2-emp-funnel-bar b2">
                  <div className="num">~</div>
                  <div className="lab">Skill match</div>
                </div>
                <div className="v2-emp-funnel-bar b3">
                  <div className="num">~</div>
                  <div className="lab">Sector fluent</div>
                </div>
                <div className="v2-emp-funnel-bar b4">
                  <div className="num">~</div>
                  <div className="lab">Shortlist</div>
                </div>
                <div className="v2-emp-funnel-bar b5">
                  <div className="num">~</div>
                  <div className="lab">Hired</div>
                </div>
              </div>
              <div
                style={{
                  marginTop: 12,
                  fontFamily: "var(--v2-font-mono)",
                  fontWeight: 700,
                  fontSize: 10,
                  color: "var(--v2-ink-500)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                Live pool · downstream stages illustrative
              </div>
            </div>
          </div>

          <div className="v2-emp-feat span-3 dark">
            <span className="v2-emp-feat-eye">Energy-aware filters</span>
            <h3 className="v2-emp-feat-h">
              Filter by the cuts that <em>matter</em>.
            </h3>
            <p className="v2-emp-feat-d">
              Sector, certifications, work setup, experience level, salary
              band, and recency &mdash; all first-class filters on the search
              page, not buried in a &ldquo;free text&rdquo; box.
            </p>
            <div className="v2-emp-feat-art">
              <div className="v2-emp-filters">
                <span className="v2-emp-filter-chip active">
                  Sector · Renewables
                  <span className="x">
                    <Icon name="x" size={8} />
                  </span>
                </span>
                <span className="v2-emp-filter-chip active">
                  Cert · P.Eng
                  <span className="x">
                    <Icon name="x" size={8} />
                  </span>
                </span>
                <span className="v2-emp-filter-chip active">
                  Setup · Remote OK
                  <span className="x">
                    <Icon name="x" size={8} />
                  </span>
                </span>
                <span className="v2-emp-filter-chip">Level · Senior</span>
                <span className="v2-emp-filter-chip">Posted · Last 7 days</span>
                <span className="v2-emp-filter-chip">Salary · C$120k+</span>
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
                  Stack filters
                </span>{" "}
                · narrow the pool by every cut that decides a hire
              </div>
            </div>
          </div>

          {/* row 2 */}
          <div className="v2-emp-feat span-2 accent">
            <span className="v2-emp-feat-eye">Live network</span>
            <div className="v2-emp-bigstat" style={{ marginTop: 18 }}>
              <em>{candidateCount}</em>
            </div>
            <p className="v2-emp-bigstat-sub">
              {candidateCount === 1
                ? "energy professional on Energized"
                : "energy professionals on Energized"}{" "}
              · {liveRoles} live{" "}
              {liveRoles === 1 ? "role" : "roles"} · {applicationCount}{" "}
              {applicationCount === 1 ? "application" : "applications"}{" "}
              tracked
            </p>
            <div className="v2-emp-feat-art">
              <div className="v2-emp-mini-bars" aria-hidden="true">
                {ILLUSTRATIVE_TIME_BARS.map((h, i) => (
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
                NETWORK GROWTH · ILLUSTRATIVE
              </div>
            </div>
          </div>

          <div className="v2-emp-feat span-2">
            <span className="v2-emp-feat-eye">Sectors covered</span>
            <h3 className="v2-emp-feat-h">
              Six <em>energy</em> sectors, one workforce.
            </h3>
            <p className="v2-emp-feat-d">
              Oil &amp; gas, renewables, nuclear, utilities, hydrogen, power
              &mdash; each treated as first-class with its own taxonomy.
            </p>
            <div className="v2-emp-feat-art">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                {sectorList.map((s) => (
                  <div
                    key={s.enum}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 12,
                      color: "var(--v2-ink-700)",
                    }}
                  >
                    <span
                      style={{
                        background: s.theme.c,
                        color: "white",
                        fontFamily: "var(--v2-font-mono)",
                        fontWeight: 700,
                        fontSize: 9,
                        padding: "3px 6px",
                        borderRadius: 3,
                        letterSpacing: "0.05em",
                      }}
                    >
                      {s.theme.mk}
                    </span>
                    {s.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="v2-emp-feat span-2">
            <span className="v2-emp-feat-eye">Certifications first</span>
            <h3 className="v2-emp-feat-h">
              <em>Tickets</em> that decide a hire.
            </h3>
            <p className="v2-emp-feat-d">
              H2S Alive, First Aid, CSTS, Red Seal, P.Eng, NACE, Fall
              Protection &mdash; all surfaced with expiry dates and credential
              IDs on every profile.
            </p>
            <div className="v2-emp-feat-art">
              <div
                style={{
                  fontFamily: "var(--v2-font-serif)",
                  fontWeight: 900,
                  fontSize: 36,
                  letterSpacing: "-0.025em",
                  color: "var(--v2-ink-950)",
                  lineHeight: 1,
                }}
              >
                {certCount}
              </div>
              <div
                style={{
                  fontFamily: "var(--v2-font-mono)",
                  fontWeight: 700,
                  fontSize: 10,
                  color: "var(--v2-ink-500)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginTop: 6,
                }}
              >
                Certifications on file
              </div>
            </div>
          </div>

          {/* row 3 */}
          <div className="v2-emp-feat span-3">
            <span className="v2-emp-feat-eye">Pipeline kanban</span>
            <h3 className="v2-emp-feat-h">
              Track every applicant <em>without leaving</em> Energized.
            </h3>
            <p className="v2-emp-feat-d">
              Move candidates through your pipeline &mdash; submitted,
              reviewed, interview, offer, hired &mdash; with intro requests,
              interview scheduling, and a clean per-role kanban view for
              every recruiter on your team.
            </p>
            <div className="v2-emp-feat-art">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(5, 1fr)",
                  gap: 8,
                }}
              >
                {[
                  { l: "Submitted", n: 12 },
                  { l: "Reviewed", n: 8 },
                  { l: "Interview", n: 4 },
                  { l: "Offer", n: 2 },
                  { l: "Hired", n: 1 },
                ].map((s) => (
                  <div
                    key={s.l}
                    style={{
                      background: "rgba(11,13,18,0.04)",
                      border: "1px solid rgba(11,13,18,0.08)",
                      borderRadius: 8,
                      padding: "10px 8px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "var(--v2-font-serif)",
                        fontWeight: 900,
                        fontSize: 24,
                        color: "var(--v2-ink-950)",
                        lineHeight: 1,
                      }}
                    >
                      {s.n}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--v2-font-mono)",
                        fontWeight: 700,
                        fontSize: 9,
                        color: "var(--v2-ink-500)",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        marginTop: 4,
                      }}
                    >
                      {s.l}
                    </div>
                  </div>
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
                PIPELINE STAGES · ILLUSTRATIVE
              </div>
            </div>
          </div>

          <div className="v2-emp-feat span-3 dark">
            <span className="v2-emp-feat-eye">Privacy &amp; control</span>
            <h3 className="v2-emp-feat-h">
              Candidates control <em>what they share</em>.
            </h3>
            <p className="v2-emp-feat-d">
              Resumes and certification documents are private by default and
              only shared via signed URLs when a candidate applies or accepts
              an intro request. Better Auth-managed sessions, Stripe-managed
              billing, and a clear data-deletion path on request.
            </p>
            <div className="v2-emp-feat-art">
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[
                  "Candidate-controlled sharing",
                  "Signed URLs for documents",
                  "Stripe billing",
                  "Better Auth sessions",
                  "Delete on request",
                ].map((b) => (
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
        <div
          style={{
            fontFamily: "var(--v2-font-mono)",
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "var(--v2-accent)",
            marginBottom: 20,
          }}
        >
          Illustrative customer story
        </div>
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
                  Illustrative VP Talent · sample customer
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
              <div className="s">vs. 6-month prior cycle.</div>
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
          Post your first role free, or send us a note about your hiring
          plans &mdash; we usually reply within four business hours.
        </p>
        <div className="v2-emp-cta-actions">
          <Link
            href="/sign-up?role=employer"
            className="v2-btn v2-btn-accent v2-btn-lg"
          >
            Post a role free
            <Icon name="arrowRight" size={18} />
          </Link>
          <Link
            href="/contact"
            className="v2-btn v2-btn-invert v2-btn-lg"
          >
            Talk to us
          </Link>
        </div>
      </div>
    </section>
  );
}
