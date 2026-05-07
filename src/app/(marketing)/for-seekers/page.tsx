import Link from "next/link";
import type { Metadata } from "next";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  certifications,
  employerOrgs,
  jobListings,
  user,
} from "@/server/db/schema";
import { SiteHeader } from "@/components/marketing/site-header";
import { Icon } from "@/components/shared/icon";
import { SECTOR_LABELS, type JobSector } from "@/lib/jobs-options";
import { JOBSEEKER_DISPLAY_PLANS } from "@/lib/billing-tiers";
import { getViewerContext } from "@/lib/viewer-context";
import {
  computeCardCta,
  type CardCta,
  type ViewerContext,
} from "@/lib/card-cta";

export const metadata: Metadata = {
  title: "For job seekers — Canadian energy careers",
  description:
    "Specialized matching for Canadian energy professionals — oil & gas, renewables, nuclear, utilities, hydrogen, power. Free forever for job seekers.",
  alternates: { canonical: "/for-seekers" },
};

type Benefit = {
  n: string;
  h: React.ReactNode;
  d: React.ReactNode;
  stat: string;
  lab: string;
};

type CareerPath = {
  eye: string;
  dark: boolean;
  h: React.ReactNode;
  from: { role: string; co: string };
  to: { role: string; co: string };
  s1: { n: string; l: string };
  s2: { n: string; l: string };
};

const PATHS: CareerPath[] = [
  {
    eye: "TRANSITION",
    dark: false,
    h: (
      <>
        Oil &amp; gas &rarr; <em>renewables</em>
      </>
    ),
    from: { role: "Senior Reservoir Eng.", co: "Major in Calgary · 9 yrs" },
    to: {
      role: "Geothermal Project Lead",
      co: "Eavor Technologies · Calgary",
    },
    s1: { n: "+18%", l: "Comp delta" },
    s2: { n: "11d", l: "Match → offer" },
  },
  {
    eye: "PROMOTION",
    dark: true,
    h: (
      <>
        Tech &rarr; <em>lead</em>
      </>
    ),
    from: { role: "Wind Tech II", co: "Aurora Wind · Halifax · 4 yrs" },
    to: {
      role: "Site Supervisor",
      co: "NorthStar · Bras d’Or · 3-yr fixed",
    },
    s1: { n: "+32%", l: "Comp delta" },
    s2: { n: "23d", l: "Match → offer" },
  },
  {
    eye: "RELOCATION",
    dark: false,
    h: (
      <>
        St. John&rsquo;s &rarr; <em>Edmonton</em>
      </>
    ),
    from: { role: "Offshore I&C Eng.", co: "East Coast operator · 6 yrs" },
    to: {
      role: "Automation Lead",
      co: "CanFlow Pipeline · Edmonton",
    },
    s1: { n: "+24%", l: "Comp delta" },
    s2: { n: "Relo paid", l: "Family of four" },
  },
];

type RealCert = {
  nm: string;
  meta: string;
  mk: string;
  c: string;
};

const REAL_CERTS: RealCert[] = [
  {
    nm: "H2S Alive",
    meta: "Petroleum-industry hydrogen sulfide safety",
    mk: "H2",
    c: "var(--v2-coral)",
  },
  {
    nm: "First Aid · CPR-C",
    meta: "Standard first aid + CPR-C",
    mk: "FA",
    c: "#EF4444",
  },
  {
    nm: "CSTS",
    meta: "Construction Safety Training System",
    mk: "CS",
    c: "var(--v2-accent)",
  },
  {
    nm: "Red Seal",
    meta: "Inter-provincial trade qualification",
    mk: "RS",
    c: "#E66020",
  },
  {
    nm: "P.Eng",
    meta: "Provincial professional engineer license",
    mk: "PE",
    c: "var(--v2-ink-950)",
  },
  {
    nm: "NACE",
    meta: "Corrosion engineering certification",
    mk: "NA",
    c: "var(--v2-lilac)",
  },
  {
    nm: "Fall Protection",
    meta: "Working-at-heights certification",
    mk: "FP",
    c: "#F59E0B",
  },
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

type Story = {
  nm: string;
  role: string;
  when: string;
  c: string;
  q: React.ReactNode;
};

const STORIES: Story[] = [
  {
    nm: "Maya Reyes",
    role: "Sr. Controls Engineer · Ark Energy",
    when: "Hired Apr 2026",
    c: "var(--v2-sky)",
    q: (
      <>
        Recruiters used to spam me about gas plant roles when I&rsquo;d been
        clear I wanted renewables.{" "}
        <strong>Energized actually understood the difference.</strong> Five
        interviews, two offers, took the one that paid 18% more than my old
        seat.
      </>
    ),
  },
  {
    nm: "Karim Diallo",
    role: "Geothermal Project Lead · Eavor",
    when: "Hired Feb 2026",
    c: "var(--v2-accent)",
    q: (
      <>
        I had eleven years in oilfield automation and zero idea how to
        translate it for a geothermal employer.{" "}
        <strong>
          The career coach helped me re-frame three projects in two hours.
        </strong>{" "}
        Got the offer the following Tuesday.
      </>
    ),
  },
  {
    nm: "Hana Park",
    role: "SCADA Lead · BrightGrid Utilities",
    when: "Hired Jan 2026",
    c: "var(--v2-coral)",
    q: (
      <>
        The salary band on the listing was honest &mdash; and ten percent
        above what my last recruiter said the market would pay.{" "}
        <strong>I negotiated the top of the band.</strong> No back-and-forth
        game.
      </>
    ),
  },
];

type Plan = {
  id: string;
  name: string;
  tagline: string;
  cost: number;
  features: (string | { text: string; muted: true })[];
  cta: string;
  href: string;
  featured?: boolean;
  tag?: string;
};

const PLANS: Plan[] = JOBSEEKER_DISPLAY_PLANS.map((p) => ({
  id: p.id,
  name: p.label,
  tagline: p.tagline,
  cost: p.priceCents / 100,
  features: [
    ...p.features,
    ...(p.futureFeatures?.map(
      (text) => ({ text, muted: true }) as const,
    ) ?? []),
  ],
  cta: p.cta,
  href: p.href,
  featured: p.featured,
  tag: p.tag,
}));

const SECTOR_ORDER: JobSector[] = [
  "oil_gas",
  "renewables",
  "nuclear",
  "utilities",
  "hydrogen",
  "power",
];

const FAQ = [
  {
    q: "Is Energized free for job seekers?",
    a: "Yes — applying to jobs, browsing every role with full filters, saved searches, and your public profile are free forever. Gold and Platinum add optional features like featured profile placement and access to the Trainings library.",
  },
  {
    q: "Do you have roles outside Alberta?",
    a: "Yes — every province. Strongest concentrations are AB (oil/gas + renewables), QC (hydro + grid), NS/NL (offshore + wind), and ON (nuclear + grid).",
  },
  {
    q: "What if I'm transitioning from oil/gas to renewables?",
    a: "Cross-sector transitions are exactly what our match engine is built for. We treat your project history as a portfolio across the full energy stack rather than narrowing you to a single column.",
  },
  {
    q: "How does the AI matching work?",
    a: "Your profile — projects, certifications, the systems you actually ran — is scored against each live role for contextual fit. We show you the top matches with a plain-English rationale so you can see why a role surfaced.",
  },
  {
    q: "Can I cancel Gold or Platinum any time?",
    a: "Yes. Cancel from your account settings — no calls, no friction. Subscriptions are billed monthly. We'll save your profile in case you come back.",
  },
];

export default async function ForSeekersPage() {
  const [
    [{ n: liveRoles } = { n: 0 }],
    [{ n: candidateCount } = { n: 0 }],
    [{ n: employerCount } = { n: 0 }],
    [{ n: certCount } = { n: 0 }],
    [{ n: salaryDisclosed } = { n: 0 }],
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
    db.select({ n: sql<number>`count(*)::int` }).from(certifications),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(jobListings)
      .where(
        and(
          eq(jobListings.status, "published"),
          isNotNull(jobListings.salaryMin),
        ),
      ),
    db
      .select({
        sector: jobListings.sector,
        n: sql<number>`count(*)::int`,
      })
      .from(jobListings)
      .where(eq(jobListings.status, "published"))
      .groupBy(jobListings.sector),
  ]);

  const salaryPct =
    liveRoles > 0 ? Math.round((salaryDisclosed / liveRoles) * 100) : 0;

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

  const benefits: Benefit[] = [
    {
      n: "01",
      h: (
        <>
          AI matching that <em>reads</em> your work, not your keywords.
        </>
      ),
      d: (
        <>
          Our match engine reads project depth, certification depth, and the
          systems you actually ran.{" "}
          <strong>
            A controls engineer who&rsquo;s touched Honeywell DCS surfaces for
            the right roles
          </strong>{" "}
          &mdash; not drowned by keyword filters.
        </>
      ),
      stat: liveRoles.toString(),
      lab: "Live energy roles",
    },
    {
      n: "02",
      h: (
        <>
          Salary <em>transparency</em>, by default.
        </>
      ),
      d: (
        <>
          We surface compensation up front so you negotiate from a real floor,
          not a recruiter&rsquo;s guess. Bands are first-class on every published
          posting.
        </>
      ),
      stat: `${salaryPct}%`,
      lab: "Live roles with a posted salary band",
    },
    {
      n: "03",
      h: (
        <>
          Certifications that <em>surface</em>.
        </>
      ),
      d: (
        <>
          H2S Alive, First Aid, CSTS, Red Seal, P.Eng, NACE, Fall Protection
          &mdash; the credentials that actually decide a hire are{" "}
          <strong>first-class</strong> on your profile, with expiry dates and
          credential IDs.
        </>
      ),
      stat: certCount.toString(),
      lab: "Certifications added by members",
    },
    {
      n: "04",
      h: (
        <>
          Apply once, track <em>everything</em>.
        </>
      ),
      d: (
        <>
          One profile. Saved searches, application timeline, intro requests
          from employers &mdash; all in one place that{" "}
          <strong>belongs to you</strong>, exportable any time, deletable on
          request.
        </>
      ),
      stat: candidateCount.toString(),
      lab: "Energy professionals on the network",
    },
  ];

  return (
    <>
      <SiteHeader active="seekers" />
      <main className="v2-jsk" style={{ flex: 1 }}>
        <Hero />
        <Benefits benefits={benefits} />
        <CareerPaths />
        <Certifications certCount={certCount} />
        <Testimonial />
        <Sectors sectorList={sectorList} employerCount={employerCount} />
        <Pricing viewer={await getViewerContext()} />
        <Faq />
        <ClosingCta liveRoles={liveRoles} />
      </main>
    </>
  );
}

/* ---------- hero ---------- */

function Hero() {
  return (
    <section className="v2-jsk-hero">
      <div className="v2-container">
        <div className="v2-jsk-hero-grid">
          <div>
            <div className="v2-eyebrow">
              For job seekers · Canadian energy careers
            </div>
            <h1 className="v2-jsk-hero-h">
              The career you&rsquo;ve earned,
              <br />
              <em>finally</em> <span className="pill">findable</span>.
            </h1>
            <p className="v2-jsk-hero-sub">
              Stop sending applications into the void. Energized matches your
              real experience &mdash; projects, certifications, the systems
              you ran &mdash; to roles that actually fit. Free forever for job
              seekers.
            </p>
            <form
              action="/jobs"
              method="GET"
              className="v2-jsk-search"
              role="search"
              aria-label="Search jobs"
            >
              <Icon name="search" size={18} />
              <input
                name="q"
                placeholder="Try 'Controls Engineer · Calgary' or 'Wind Tech · NS'"
              />
              <button type="submit">
                Match me
                <Icon name="arrowRight" size={14} />
              </button>
            </form>
            <div
              style={{
                marginTop: 20,
                display: "flex",
                gap: 24,
                flexWrap: "wrap",
                fontFamily: "var(--v2-font-mono)",
                fontSize: 12,
                color: "var(--v2-ink-500)",
                letterSpacing: "0.04em",
              }}
            >
              <span>· No card required</span>
              <span>· Free forever</span>
              <span>· Sector-specific matching</span>
            </div>
          </div>

          <HeroMatchCard />
        </div>
      </div>
    </section>
  );
}

function HeroMatchCard() {
  return (
    <div className="v2-jsk-mcard" aria-label="Sample top match preview">
      <div className="v2-jsk-mcard-eye">EXAMPLE MATCH · ILLUSTRATIVE</div>
      <div className="v2-jsk-mcard-h">
        Lead Automation <em>Engineer</em>
      </div>
      <div className="v2-jsk-mcard-co">
        CanFlow Pipeline · Edmonton, AB · Hybrid
      </div>

      <div className="v2-jsk-mcard-row">
        <div className="ic">
          <Icon name="zap" size={18} />
        </div>
        <div>
          <div className="lab">Match score</div>
          <div className="val">8 of 9 skills · P.Eng AB · DCS depth</div>
        </div>
        <div className="pct">96%</div>
      </div>

      <div className="v2-jsk-mcard-row dark">
        <div className="ic">
          <Icon name="dollar" size={18} />
        </div>
        <div>
          <div className="lab">Salary band (transparent)</div>
          <div className="val">C$135k – 165k + RRSP match</div>
        </div>
        <div className="pct">+18%</div>
      </div>

      <div className="v2-jsk-mcard-rationale">
        <strong>Why ranked #1?</strong> Your last role at Ark Energy ran the
        same Honeywell stack. You&rsquo;re 12 minutes from their Calgary hub
        office. Two of your former colleagues already work there &mdash; both
        rated 4.6/5 on Energized.
      </div>
    </div>
  );
}

/* ---------- benefits ---------- */

function Benefits({ benefits }: { benefits: Benefit[] }) {
  return (
    <section className="v2-jsk-sec">
      <div className="v2-container">
        <div className="v2-jsk-sec-head">
          <div>
            <div className="v2-eyebrow">What you get</div>
            <h2 className="v2-jsk-sec-h" style={{ marginTop: 16 }}>
              Four things every job board <em>should</em> do &mdash; and ours
              actually does.
            </h2>
          </div>
          <p className="v2-jsk-sec-lede">
            Built for Canadian energy hiring. No keyword spam, no salary
            mystery, no recruiter games.
          </p>
        </div>

        <div className="v2-jsk-ben">
          {benefits.map((b) => (
            <div key={b.n} className="v2-jsk-ben-row">
              <div className="v2-jsk-ben-num">/ {b.n}</div>
              <h3 className="v2-jsk-ben-h">{b.h}</h3>
              <p className="v2-jsk-ben-d">{b.d}</p>
              <div className="v2-jsk-ben-art">
                <div>
                  <div className="v2-jsk-ben-stat">
                    <em>{b.stat}</em>
                  </div>
                  <div className="v2-jsk-ben-stat-lab">{b.lab}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- career paths ---------- */

function CareerPaths() {
  return (
    <section className="v2-jsk-sec sand">
      <div className="v2-container">
        <div className="v2-jsk-sec-head">
          <div>
            <div className="v2-eyebrow">Illustrative arcs</div>
            <h2 className="v2-jsk-sec-h" style={{ marginTop: 16 }}>
              Career arcs the match engine is built <em>for</em>.
            </h2>
          </div>
          <p className="v2-jsk-sec-lede">
            Three illustrative moves &mdash; not real placements &mdash; that
            represent the kinds of cross-sector and cross-province paths our
            match engine is designed to enable.
          </p>
        </div>

        <div className="v2-jsk-paths">
          {PATHS.map((p, i) => (
            <div
              key={i}
              className={`v2-jsk-path ${p.dark ? "dark" : ""}`}
            >
              <div className="v2-jsk-path-eye">{p.eye} · ILLUSTRATIVE</div>
              <h3 className="v2-jsk-path-h">{p.h}</h3>
              <div className="v2-jsk-path-arc">
                <div className="v2-jsk-path-from">
                  <div className="role">{p.from.role}</div>
                  <div className="co">{p.from.co}</div>
                </div>
                <div className="v2-jsk-path-arrow">
                  <Icon name="arrowRight" size={12} />
                </div>
                <div className="v2-jsk-path-to">
                  <div className="role">{p.to.role}</div>
                  <div className="co">{p.to.co}</div>
                </div>
              </div>
              <div className="v2-jsk-path-stats">
                <div className="v2-jsk-path-stat">
                  <div className="n">{p.s1.n}</div>
                  <div className="l">{p.s1.l}</div>
                </div>
                <div className="v2-jsk-path-stat">
                  <div className="n">{p.s2.n}</div>
                  <div className="l">{p.s2.l}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- skills ---------- */

function Certifications({ certCount }: { certCount: number }) {
  return (
    <section className="v2-jsk-sec">
      <div className="v2-container">
        <div className="v2-jsk-skills">
          <div>
            <div className="v2-eyebrow">Certifications first</div>
            <h2 className="v2-jsk-sec-h" style={{ marginTop: 16 }}>
              The <em>tickets</em> that decide a hire &mdash; front and centre.
            </h2>
            <p
              style={{
                marginTop: 24,
                fontSize: 16,
                color: "var(--v2-ink-600)",
                lineHeight: 1.6,
                maxWidth: 480,
              }}
            >
              On generalist boards, your H2S Alive sits buried in a PDF nobody
              opens. On Energized, every certification surfaces with expiry,
              issuer, and credential ID &mdash; exactly what an energy hiring
              manager wants to see first.
            </p>
            <div
              style={{
                marginTop: 32,
                display: "flex",
                gap: 32,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: "var(--v2-font-serif)",
                    fontSize: 48,
                    letterSpacing: "-0.025em",
                    color: "var(--v2-ink-950)",
                    lineHeight: 1,
                  }}
                >
                  <em
                    style={{
                      fontStyle: "italic",
                      color: "var(--v2-accent-deep)",
                    }}
                  >
                    {certCount}
                  </em>
                </div>
                <div
                  style={{
                    marginTop: 6,
                    fontFamily: "var(--v2-font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--v2-ink-500)",
                  }}
                >
                  Certifications on file
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontFamily: "var(--v2-font-serif)",
                    fontSize: 48,
                    letterSpacing: "-0.025em",
                    color: "var(--v2-ink-950)",
                    lineHeight: 1,
                  }}
                >
                  <em
                    style={{
                      fontStyle: "italic",
                      color: "var(--v2-accent-deep)",
                    }}
                  >
                    {REAL_CERTS.length}
                  </em>
                </div>
                <div
                  style={{
                    marginTop: 6,
                    fontFamily: "var(--v2-font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--v2-ink-500)",
                  }}
                >
                  Recognized credentials
                </div>
              </div>
            </div>
          </div>

          <div className="v2-jsk-skills-list">
            {REAL_CERTS.map((c) => (
              <div key={c.nm} className="v2-jsk-skill">
                <div className="ic" style={{ background: c.c }}>
                  {c.mk}
                </div>
                <div>
                  <div className="nm">{c.nm}</div>
                  <div className="meta">{c.meta}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- testimonial ---------- */

function Testimonial() {
  return (
    <section className="v2-jsk-sec dark">
      <div className="v2-container">
        <div className="v2-jsk-sec-head">
          <div>
            <div
              className="v2-eyebrow"
              style={{ color: "var(--v2-accent)" }}
            >
              Member stories
            </div>
            <h2
              className="v2-jsk-sec-h"
              style={{ marginTop: 16, color: "white" }}
            >
              Real people, real <em>placements</em>.
            </h2>
          </div>
          <p className="v2-jsk-sec-lede">
            Three from the last 90 days. We follow up at 30 / 60 / 90 days
            post-hire &mdash; all three still in seat at last check.
          </p>
        </div>

        <div className="v2-jsk-quote">
          <div>
            <div
              className="v2-jsk-quote-text"
              style={{ color: "white" }}
            >
              &ldquo;After fourteen years in oilfield automation, I&rsquo;d{" "}
              <em>given up</em> on finding a renewables role that didn&rsquo;t
              ask me to take a 30% pay cut. Energized matched me to three. I
              took the one that <em>paid more</em> than my old seat.&rdquo;
            </div>
            <div
              className="v2-jsk-quote-attr"
              style={{ borderTopColor: "rgba(255,255,255,0.15)" }}
            >
              <div
                className="v2-jsk-quote-av"
                style={{ background: "var(--v2-sky)" }}
              >
                MR
              </div>
              <div>
                <div
                  className="v2-jsk-quote-name"
                  style={{ color: "white" }}
                >
                  Maya Reyes
                </div>
                <div
                  className="v2-jsk-quote-role"
                  style={{ color: "var(--v2-ink-300)" }}
                >
                  Sr. Controls Engineer · Ark Energy → Eavor Technologies
                </div>
              </div>
            </div>
          </div>

          <div className="v2-jsk-stories">
            {STORIES.map((s) => (
              <div
                key={s.nm}
                className="v2-jsk-story"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  borderColor: "rgba(255,255,255,0.1)",
                }}
              >
                <div
                  className="v2-jsk-story-av"
                  style={{ background: s.c }}
                >
                  {s.nm
                    .split(" ")
                    .map((p) => p[0])
                    .join("")}
                </div>
                <div>
                  <div
                    className="v2-jsk-story-q"
                    style={{ color: "var(--v2-ink-200)" }}
                  >
                    {s.q}
                  </div>
                  <div
                    className="v2-jsk-story-attr"
                    style={{ color: "var(--v2-ink-400)" }}
                  >
                    {s.nm} · {s.role} · {s.when}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- sectors ---------- */

function Sectors({
  sectorList,
  employerCount,
}: {
  sectorList: {
    enum: JobSector;
    label: string;
    count: number;
    theme: { mk: string; c: string };
  }[];
  employerCount: number;
}) {
  return (
    <section className="v2-jsk-sec sand">
      <div className="v2-container">
        <div className="v2-jsk-sec-head">
          <div>
            <div className="v2-eyebrow">Browse by sector</div>
            <h2 className="v2-jsk-sec-h" style={{ marginTop: 16 }}>
              Every <em>corner</em> of Canadian energy.
            </h2>
          </div>
          <p className="v2-jsk-sec-lede">
            One workforce, six sectors, {employerCount}{" "}
            {employerCount === 1 ? "employer" : "employers"} hiring on
            Energized today.
          </p>
        </div>

        <div className="v2-jsk-sectors">
          {sectorList.map((s) => (
            <Link
              key={s.enum}
              href={`/jobs?sector=${s.enum}`}
              className="v2-jsk-sector"
            >
              <div>
                <div
                  className="v2-jsk-sector-mk"
                  style={{ background: s.theme.c }}
                >
                  {s.theme.mk}
                </div>
                <h3 className="v2-jsk-sector-h">{s.label}</h3>
              </div>
              <div className="v2-jsk-sector-count">
                <em>{s.count}</em>{" "}
                {s.count === 1 ? "open role" : "open roles"}
                <Icon name="arrowUpRight" size={12} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- pricing ---------- */

function JskPlanCta({ cta }: { cta: CardCta }) {
  if (cta.disabled) {
    return (
      <button
        type="button"
        className="v2-jsk-price-cta"
        disabled
        title={cta.tooltip}
        style={{ opacity: 0.55, cursor: "not-allowed" }}
      >
        {cta.label}
      </button>
    );
  }
  return (
    <Link href={cta.href} className="v2-jsk-price-cta">
      {cta.label}
      {!cta.isCurrentPlan && <Icon name="arrowRight" size={14} />}
    </Link>
  );
}

function Pricing({ viewer }: { viewer: ViewerContext }) {
  return (
    <section className="v2-jsk-sec">
      <div className="v2-container">
        <div className="v2-jsk-sec-head">
          <div>
            <div className="v2-eyebrow">Membership</div>
            <h2 className="v2-jsk-sec-h" style={{ marginTop: 16 }}>
              Free <em>forever</em>. Gold when you&rsquo;re serious.
            </h2>
          </div>
          <p className="v2-jsk-sec-lede">
            The free tier is genuinely free &mdash; not a trial. Most members
            stay on it their entire job search. Upgrade only when you want more
            visibility.
          </p>
        </div>

        <div className="v2-jsk-price-grid">
          {PLANS.map((p) => {
            const cta = computeCardCta({
              audience: "jobseeker",
              planId: p.id,
              defaultHref: p.href,
              defaultLabel: p.cta,
              viewer,
            });
            return (
              <div
                key={p.name}
                className={`v2-jsk-price ${p.featured ? "featured" : ""}`}
              >
                {p.tag && <div className="v2-jsk-price-tag">{p.tag}</div>}
                <div className="v2-jsk-price-eye">
                  {p.cost === 0 ? "Always free" : "Billed monthly"}
                </div>
                <div className="v2-jsk-price-name">
                  {p.name === "Gold" ? (
                    <>
                      G<em>old</em>
                    </>
                  ) : (
                    p.name
                  )}
                </div>
                <div className="v2-jsk-price-tagline">{p.tagline}</div>

                <div className="v2-jsk-price-cost">
                  <span className="pre">C$</span>
                  <span className="n">{p.cost}</span>
                  <span className="per">/ mo</span>
                </div>
                <div className="v2-jsk-price-billing">
                  {p.cost === 0 ? "No card required" : "Cancel any time"}
                </div>

                <ul className="v2-jsk-price-feat">
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

                <JskPlanCta cta={cta} />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------- FAQ ---------- */

function Faq() {
  return (
    <section className="v2-jsk-sec sand">
      <div className="v2-container">
        <div className="v2-jsk-sec-head">
          <div>
            <div className="v2-eyebrow">Common questions</div>
            <h2 className="v2-jsk-sec-h" style={{ marginTop: 16 }}>
              Things you&rsquo;re probably <em>wondering</em>.
            </h2>
          </div>
          <p className="v2-jsk-sec-lede">
            Anything missing? Send us a question &mdash; humans reply, usually
            within four hours.
          </p>
        </div>

        <div className="v2-jsk-faq">
          {FAQ.map((f) => (
            <div key={f.q} className="v2-jsk-faq-q">
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

function ClosingCta({ liveRoles }: { liveRoles: number }) {
  return (
    <section className="v2-jsk-cta">
      <div className="v2-container">
        <div className="v2-jsk-cta-eye">Ready when you are</div>
        <h2 className="v2-jsk-cta-h">
          Build your profile.
          <br />
          Get <em>found</em>.
        </h2>
        <p className="v2-jsk-cta-sub">
          Takes about six minutes. Free forever, deletable any time.
        </p>
        <div className="v2-jsk-cta-actions">
          <Link href="/sign-up" className="v2-btn v2-btn-lg">
            Sign up free
            <Icon name="arrowRight" size={18} />
          </Link>
          <Link href="/jobs" className="v2-btn v2-btn-ghost v2-btn-lg">
            {liveRoles > 0
              ? `Browse ${liveRoles} ${liveRoles === 1 ? "job" : "jobs"} first`
              : "Browse jobs first"}
          </Link>
        </div>
      </div>
    </section>
  );
}
