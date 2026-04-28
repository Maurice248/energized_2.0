import Link from "next/link";
import type { Metadata } from "next";
import { eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  employerOrgs,
  jobListings,
  profiles,
} from "@/server/db/schema";
import { SiteHeader } from "@/components/marketing/site-header";
import { Icon } from "@/components/shared/icon";
import { PricingSection } from "./pricing-section";

export const metadata: Metadata = {
  title: "About — Energized",
  description:
    "The job network for Canada's energy transition — from reservoirs to renewables, from junior techs to senior P.Engs.",
};

const SEEKER_OFFERS = [
  {
    n: "01",
    t: "AI-matched roles, not keyword spam",
    d: "Our match engine reads the substance of your work — projects, certifications, the actual systems you ran — not just job titles.",
  },
  {
    n: "02",
    t: "Salary transparency by default",
    d: "Every published role posts a band. No hide-the-number games — you know what you're walking into before you apply.",
  },
  {
    n: "03",
    t: "Tickets that surface",
    d: "H2S Alive, First Aid, CSTS, Red Seal, P.Eng, NACE — the credentials that actually decide a hire are first-class on your profile.",
  },
  {
    n: "04",
    t: "A career, not a queue",
    d: "Saved searches, application timelines, profile views — kept in one place that you own and can take with you.",
  },
];

const EMPLOYER_OFFERS = [
  {
    n: "01",
    t: "Pre-vetted, sector-fluent talent",
    d: "Filter by ticket, sector, rotation tolerance, and clearance — the cuts that actually narrow your shortlist.",
  },
  {
    n: "02",
    t: "AI-assisted shortlists",
    d: "Post a role and surface ranked candidates with rationale within the hour. Hire the ones you actually meet.",
  },
  {
    n: "03",
    t: "Pipeline kanban that doesn't fight you",
    d: "Five-column applicant kanban with role-gated moves. Recruiter seats included — your team, your way.",
  },
  {
    n: "04",
    t: "Stripe billing, no surprises",
    d: "Monthly subscription, cancel any time. No per-hire bounty, no posting volume games — pay only for the cycle you use.",
  },
];

// TODO: replace with real team members before public launch.
// These names/bios come from the reference design (~/Desktop/Energized/v2-about.jsx)
// and are placeholder content. Shipping fictional names + fictional bios on a
// public site is a trust/legal risk — swap in real data first.
const TEAM = [
  {
    name: "Hana Reyes",
    role: "Co-founder & CEO",
    initials: "HR",
    color: "#1CAAE2",
    tag: "Calgary",
    bio: "12 years building hiring tech for resource industries. Former Head of Talent at PetroLink.",
  },
  {
    name: "Marc-André Boucher",
    role: "Co-founder & CTO",
    initials: "MB",
    color: "#0F2545",
    tag: "Montréal",
    bio: "Built the matching engines at three Series-B SaaS companies. Loves grids and graphs.",
  },
  {
    name: "Aisha Olatunji",
    role: "Head of Talent Network",
    initials: "AO",
    color: "#004984",
    tag: "Toronto",
    bio: "Spent a decade placing senior energy hires. Now hand-picks our recruiter partners.",
  },
  {
    name: "Jules Tremblay",
    role: "Head of Design",
    initials: "JT",
    color: "#FF7A59",
    tag: "Halifax",
    bio: "Editorial obsessive. Believes a job board is a publication first.",
  },
  {
    name: "Karim Diallo",
    role: "Head of Field Operations",
    initials: "KD",
    color: "#F59E0B",
    tag: "Edmonton",
    bio: "Former drilling supervisor. Keeps us honest about what techs actually need.",
  },
  {
    name: "Priya Anand",
    role: "Head of Employer Success",
    initials: "PA",
    color: "#B9A8FF",
    tag: "Vancouver",
    bio: "Onboarded 600+ employers. Hates a slow applicant pipeline more than anyone.",
  },
  {
    name: "Lin Zhao",
    role: "Head of Data Science",
    initials: "LZ",
    color: "#5B6CFF",
    tag: "Toronto",
    bio: "Built our match model. Publishes annual energy comp reports that everyone reads.",
  },
  {
    name: "Daniel Okafor",
    role: "Head of Policy & Trust",
    initials: "DO",
    color: "#1CAAE2",
    tag: "Ottawa",
    bio: "Keeps the platform honest, fair, and compliant — across 13 provinces and territories.",
  },
];

const VALUES = [
  {
    n: "01",
    t: "Honest about the transition",
    d: "We surface oil & gas, renewables, nuclear, utilities, hydrogen, and power side-by-side. The energy transition is real, and so is the work that's already paying the bills.",
  },
  {
    n: "02",
    t: "Built for the field, not the office",
    d: "Most candidates here wear hard hats. The product is fast on a 4G connection in a Fort Mac trailer or a wind site in Halifax.",
  },
  {
    n: "03",
    t: "Fees that don't punish hiring",
    d: "Flat employer pricing per cycle, no per-hire bounty. The right hire shouldn't cost you more than the wrong one.",
  },
];

export default async function AboutPage() {
  const [profilesCountRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(profiles);
  const [employerCountRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(employerOrgs);
  const [liveRolesRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(jobListings)
    .where(eq(jobListings.status, "published"));

  const candidates = profilesCountRow?.n ?? 0;
  const employers = employerCountRow?.n ?? 0;
  const liveRoles = liveRolesRow?.n ?? 0;

  const stats = [
    { value: String(candidates), label: "Active candidates" },
    { value: String(employers), label: "Energy employers" },
    { value: "6", label: "Energy sub-sectors" },
    { value: String(liveRoles), label: "Live roles right now" },
  ];

  return (
    <>
      <SiteHeader active="about" />
      <main className="v2-about" style={{ flex: 1 }}>
        <Hero stats={stats} />
        <Story />
        <Offers />
        <PricingSection />
        <Values />
        <Team />
        <FinalCta />
      </main>
    </>
  );
}

/* ---------- hero ---------- */

function Hero({
  stats,
}: {
  stats: { value: string; label: string }[];
}) {
  return (
    <section className="v2-about-hero">
      <div className="v2-container">
        <div className="v2-about-hero-grid">
          <div>
            <div className="v2-eyebrow">About Energized</div>
            <h1 className="v2-about-headline">
              The job network for <em>Canada&rsquo;s</em>{" "}
              <span className="pill">energy</span> transition.
            </h1>
          </div>
          <p className="v2-about-lede">
            We&rsquo;re a Canadian team building the modern hiring layer for
            everything that powers the country — from reservoirs to
            renewables, from junior techs to senior P.Engs.
          </p>
        </div>
        <div className="v2-about-stats">
          {stats.map((s, i) => (
            <div key={i} className="v2-about-stat">
              <div className="v2-about-stat-num">
                <em>{s.value}</em>
              </div>
              <div className="v2-about-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- story ---------- */

function Story() {
  return (
    <section className="v2-story">
      <div className="v2-container">
        <div className="v2-story-grid">
          <div className="v2-story-side">
            <div className="v2-eyebrow">Our story</div>
            <h2>
              A platform <em>worthy</em> of the people who keep the lights
              on.
            </h2>
          </div>
          <div className="v2-story-body">
            <p>
              Energy hiring is broken in a way nobody on the field-side or
              the recruiter-side has the tools to fix. Generic job boards
              reduce a P.Eng with twelve years of upstream automation
              experience to a ranked list of keywords. Specialized boards
              lock the data away. Recruiters work in spreadsheets.
              Candidates re-type their entire career every Tuesday.
            </p>
            <p>
              We started Energized in 2026 to build something{" "}
              <em>better suited to the work itself</em>. The energy industry
              is the largest employer in the country and the largest single
              factor in our climate trajectory. The hiring infrastructure
              should match the stakes.
            </p>
            <p>
              So: tickets surface. Salary bands publish by default. Match
              scoring reads the substance of a profile, not the keywords.
              And every hire — oil sands or offshore wind — happens on the
              same platform, on the same terms.
            </p>
            <div className="v2-story-quote">
              <p>
                You shouldn&rsquo;t need to know somebody who knows somebody
                to find a great job in this industry. We&rsquo;re building
                the platform we wish we&rsquo;d had.
              </p>
              <div className="v2-story-quote-author">
                <div
                  className="v2-story-quote-avatar"
                  style={{ background: "var(--v2-accent-deep)" }}
                >
                  EZ
                </div>
                <div>
                  <strong style={{ color: "var(--v2-ink-950)" }}>
                    The Energized team
                  </strong>{" "}
                  · Calgary &amp; remote
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- what we offer ---------- */

function Offers() {
  return (
    <section className="v2-offer">
      <div className="v2-container">
        <div className="v2-offer-head">
          <div>
            <div className="v2-eyebrow">What we offer</div>
            <h2 style={{ marginTop: 12 }}>
              Two sides of the <em>same</em> hiring equation.
            </h2>
          </div>
          <p>
            One platform, designed end-to-end for the people doing the work
            and the people building the teams.
          </p>
        </div>

        <div className="v2-offer-pair">
          {/* Job seekers */}
          <div className="v2-offer-panel">
            <div className="v2-offer-eye">For job seekers</div>
            <h3 className="v2-offer-title">
              A career <em>built around you</em>, not the other way around.
            </h3>
            <p className="v2-offer-sub">
              Whether you&rsquo;re a wind tech in Halifax or a reservoir
              engineer in Calgary, we bring the right roles to you and keep
              your search organized.
            </p>
            <ul className="v2-offer-list">
              {SEEKER_OFFERS.map((o) => (
                <li key={o.n} className="v2-offer-item">
                  <div className="v2-offer-num">{o.n}</div>
                  <div>
                    <div className="v2-offer-item-title">{o.t}</div>
                    <div className="v2-offer-item-desc">{o.d}</div>
                  </div>
                </li>
              ))}
            </ul>
            <Link href="/jobs" className="v2-offer-cta">
              Find work <Icon name="arrowRight" size={14} />
            </Link>
          </div>

          {/* Employers */}
          <div className="v2-offer-panel dark">
            <div className="v2-offer-eye">For employers</div>
            <h3 className="v2-offer-title">
              Hire the <em>right twenty-five</em>, not the random four
              hundred.
            </h3>
            <p className="v2-offer-sub">
              Energy hiring is highly specialized. Our match engine reads
              certifications, project depth, and rotation patterns the way
              a seasoned recruiter would.
            </p>
            <ul className="v2-offer-list">
              {EMPLOYER_OFFERS.map((o) => (
                <li key={o.n} className="v2-offer-item">
                  <div className="v2-offer-num">{o.n}</div>
                  <div>
                    <div className="v2-offer-item-title">{o.t}</div>
                    <div className="v2-offer-item-desc">{o.d}</div>
                  </div>
                </li>
              ))}
            </ul>
            <Link
              href="/sign-up?role=employer"
              className="v2-offer-cta"
            >
              Post a role <Icon name="arrowRight" size={14} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- values ---------- */

function Values() {
  return (
    <section className="v2-values">
      <div className="v2-container">
        <div className="v2-values-head">
          <div>
            <div className="v2-eyebrow v2-eyebrow-light">How we work</div>
            <h2 style={{ marginTop: 12 }}>
              Three things we <em>refuse</em> to compromise on.
            </h2>
          </div>
        </div>
        <div className="v2-values-grid">
          {VALUES.map((v) => (
            <div key={v.n} className="v2-value">
              <div className="v2-value-num">{v.n}</div>
              <h4>{v.t}</h4>
              <p>{v.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- team ---------- */

function Team() {
  return (
    <section className="v2-team">
      <div className="v2-container">
        <div className="v2-team-head">
          <div>
            <div className="v2-eyebrow">The team</div>
            <h2 style={{ marginTop: 12 }}>
              Built by people who&rsquo;ve been on{" "}
              <em>both sides</em> of the hire.
            </h2>
          </div>
          <p>
            Half came from energy. Half came from product. All of us have
            hired — or been hired — for tough roles before.
          </p>
        </div>

        <div className="v2-team-grid">
          {TEAM.map((m) => (
            <div key={m.name} className="v2-member">
              <div
                className="v2-member-photo"
                style={{ ["--mc" as string]: m.color } as React.CSSProperties}
              >
                <div className="v2-member-tag">{m.tag}</div>
                <div className="v2-member-initials">{m.initials}</div>
              </div>
              <div className="v2-member-info">
                <div className="v2-member-name">{m.name}</div>
                <div className="v2-member-role">{m.role}</div>
                <div className="v2-member-bio">{m.bio}</div>
                <div className="v2-member-links">
                  <button
                    type="button"
                    className="v2-member-link"
                    aria-label="Website"
                  >
                    <Icon name="globe" size={13} />
                  </button>
                  <button
                    type="button"
                    className="v2-member-link"
                    aria-label="LinkedIn"
                  >
                    <Icon name="building" size={13} />
                  </button>
                  <button
                    type="button"
                    className="v2-member-link"
                    aria-label="Email"
                  >
                    <Icon name="mail" size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- final CTA ---------- */

function FinalCta() {
  return (
    <section className="v2-cta-band">
      <div className="v2-container">
        <div className="v2-eyebrow v2-eyebrow-light">Ready when you are</div>
        <h2
          className="v2-h2"
          style={{ marginTop: 18, fontSize: "clamp(44px, 6vw, 88px)" }}
        >
          Start the next <em>chapter</em> of your career — or your team&rsquo;s.
        </h2>
        <p
          style={{
            color: "var(--v2-ink-300)",
            maxWidth: 560,
            marginTop: 24,
            fontSize: 17,
          }}
        >
          Free for jobseekers. Subscription for employers, cancel any time.
        </p>
        <div className="v2-cta-actions">
          <Link href="/jobs" className="v2-btn v2-btn-accent v2-btn-lg">
            Find work
            <Icon name="arrowRight" size={16} />
          </Link>
          <Link
            href="/sign-up?role=employer"
            className="v2-btn v2-btn-invert v2-btn-lg"
          >
            Hire on Energized
            <Icon name="arrowUpRight" size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
