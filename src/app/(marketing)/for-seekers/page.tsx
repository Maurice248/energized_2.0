import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/marketing/site-header";
import { Icon } from "@/components/shared/icon";

export const metadata: Metadata = {
  title: "For job seekers — Canadian energy careers",
  description:
    "Specialized matching for Canadian energy professionals — controls, instrumentation, wind, solar, nuclear, hydrogen. Free forever. Stealth mode by default.",
  alternates: { canonical: "/for-seekers" },
};

type Benefit = {
  n: string;
  h: React.ReactNode;
  d: React.ReactNode;
  stat: string;
  lab: string;
};

const BENEFITS: Benefit[] = [
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
    stat: "94%",
    lab: "Match accuracy on placements",
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
        Every role posts a band &mdash; non-negotiable. We pull comp data from{" "}
        <strong>22,000 verified placements</strong> across Canadian energy so
        you negotiate from a real floor, not a recruiter&rsquo;s guess.
      </>
    ),
    stat: "C$2.1B",
    lab: "Salaries placed via Energized",
  },
  {
    n: "03",
    h: (
      <>
        Skills <em>badges</em> that recruiters actually weigh.
      </>
    ),
    d: (
      <>
        PLC, SCADA, GWO, P.Eng track &mdash; verifiable assessments graded by
        working senior engineers.{" "}
        <strong>Verified candidates get 3.4&times; more recruiter messages.</strong>
      </>
    ),
    stat: "3.4×",
    lab: "More recruiter inbound",
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
        One profile. Saved searches, application timeline, message history,
        recruiter ratings &mdash; all in one place that{" "}
        <strong>belongs to you</strong>, exportable any time, deletable on
        request.
      </>
    ),
    stat: "47k",
    lab: "Active members across Canada",
  },
  {
    n: "05",
    h: (
      <>
        Career <em>coaching</em>, not interview prep theater.
      </>
    ),
    d: (
      <>
        Pro members get a quarterly mock interview with a working senior in
        your sector. Career members get a dedicated coach who&rsquo;s placed
        P.Engs across Alberta and Ontario.{" "}
        <strong>Real people. Real placements.</strong>
      </>
    ),
    stat: "92%",
    lab: "Interview-to-offer (coached)",
  },
  {
    n: "06",
    h: (
      <>
        Stealth mode for the <em>currently employed</em>.
      </>
    ),
    d: (
      <>
        Browse and message in <strong>Stealth</strong> &mdash; your current
        employer&rsquo;s email domain is automatically excluded from every
        search where you appear. No pings, no awkward &ldquo;saw you on a job
        site&rdquo; calls.
      </>
    ),
    stat: "78%",
    lab: "Members are passively employed",
  },
];

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

type Skill = {
  nm: string;
  meta: string;
  mk: string;
  c: string;
  badge: "verified" | "available" | "coming";
  label: string;
};

const SKILLS: Skill[] = [
  {
    nm: "Honeywell Experion DCS",
    meta: "Verified · 47 questions · 90 min",
    mk: "HX",
    c: "var(--v2-coral)",
    badge: "verified",
    label: "Earn badge",
  },
  {
    nm: "Allen-Bradley PLC / RSLogix 5000",
    meta: "Verified · 38 questions · 75 min",
    mk: "AB",
    c: "#E66020",
    badge: "verified",
    label: "Earn badge",
  },
  {
    nm: "GWO Basic Safety Training",
    meta: "Pre-credential prep · field-tested",
    mk: "GW",
    c: "var(--v2-accent)",
    badge: "verified",
    label: "Earn badge",
  },
  {
    nm: "P.Eng track — Power Systems",
    meta: "Self-paced · APEGA aligned · 6 weeks",
    mk: "PE",
    c: "var(--v2-ink-950)",
    badge: "available",
    label: "Available",
  },
  {
    nm: "Yokogawa CENTUM VP",
    meta: "Verified · 32 questions · 60 min",
    mk: "YO",
    c: "var(--v2-lilac)",
    badge: "verified",
    label: "Earn badge",
  },
  {
    nm: "Geothermal Drilling Ops",
    meta: "In development · Q3 2026",
    mk: "GD",
    c: "#F59E0B",
    badge: "coming",
    label: "Coming soon",
  },
];

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
  name: string;
  tagline: string;
  cost: number;
  features: (string | { text: string; muted: true })[];
  cta: string;
  href: string;
  featured?: boolean;
  tag?: string;
};

const PLANS: Plan[] = [
  {
    name: "Free",
    tagline: "Get on the radar",
    cost: 0,
    features: [
      "Unlimited applications",
      "Basic AI match (top 5 / week)",
      "Saved searches & alerts",
      "Public profile + resume hosting",
      "Stealth mode",
      { text: "Skills assessments", muted: true },
      { text: "Direct recruiter messaging", muted: true },
      { text: "Mock interviews", muted: true },
    ],
    cta: "Sign up free",
    href: "/sign-up",
  },
  {
    name: "Pro",
    tagline: "Find the right one, faster",
    cost: 15,
    featured: true,
    tag: "Most popular",
    features: [
      "Everything in Free",
      "Unlimited AI matches with rationale",
      "Direct recruiter messaging",
      "Resume review by an energy specialist",
      "Salary insights & comp comparator",
      "Verified skills badges",
      "1 mock interview / quarter",
      "Application analytics",
    ],
    cta: "Try Pro free for 14 days",
    href: "/sign-up?plan=pro",
  },
  {
    name: "Career",
    tagline: "White-glove placement",
    cost: 39,
    features: [
      "Everything in Pro",
      "Dedicated career coach",
      "Resume + LinkedIn rewrite",
      "Negotiation playbook + live support",
      "Priority recruiter inbound",
      "Quarterly market briefings",
      "Network introductions on request",
      "90-day satisfaction guarantee",
    ],
    cta: "Talk to a coach",
    href: "/contact?topic=career",
  },
];

const SECTORS = [
  { mk: "OG", c: "var(--v2-ink-950)", h: "Oil & Gas", count: "742" },
  { mk: "WD", c: "var(--v2-sky)", h: "Wind", count: "328" },
  { mk: "SO", c: "#EF4444", h: "Solar", count: "264" },
  { mk: "GR", c: "var(--v2-accent)", h: "Grid & Utilities", count: "491" },
  { mk: "GT", c: "#F59E0B", h: "Geothermal", count: "112" },
  { mk: "NU", c: "var(--v2-lilac)", h: "Nuclear", count: "186" },
  { mk: "HY", c: "var(--v2-accent-deep)", h: "Hydrogen", count: "94" },
  { mk: "BS", c: "var(--v2-coral)", h: "Battery & Storage", count: "203" },
];

const FAQ = [
  {
    q: "Is Energized free for job seekers?",
    a: "Yes — applying to jobs, AI matching, saved searches, and your public profile are free forever. Pro (C$15/mo billed yearly) and Career (C$39/mo) add unlimited matching, recruiter messaging, and coaching.",
  },
  {
    q: "Will my current employer find out I'm browsing?",
    a: "Not unless you tell them. Stealth mode automatically excludes your current employer's email domain from every search where you appear, and your profile is invisible to them by default.",
  },
  {
    q: "Do you have roles outside Alberta?",
    a: "Yes — every province. Strongest concentrations are AB (oil/gas + renewables), QC (hydro + grid), NS/NL (offshore + wind), and ON (nuclear + grid).",
  },
  {
    q: "What if I'm transitioning from oil/gas to renewables?",
    a: "That's our most common path — about 38% of placements last quarter. Career coaches specialize in re-framing your project history for renewables hiring managers, and our skills library covers both stacks.",
  },
  {
    q: "How does Stealth mode work exactly?",
    a: "Toggle it on, add your current employer's domain, and you become invisible to anyone with that email. Your profile still ranks in matches — recruiters from other companies just see 'Confidential candidate' until you choose to reveal yourself.",
  },
  {
    q: "Can I cancel Pro or Career any time?",
    a: "Yes. Cancel from your account settings — no calls, no friction. Annual subscriptions are prorated back to your card. We'll save your profile in case you come back.",
  },
];

export default function ForSeekersPage() {
  return (
    <>
      <SiteHeader active="seekers" />
      <main className="v2-jsk" style={{ flex: 1 }}>
        <Hero />
        <Benefits />
        <CareerPaths />
        <Skills />
        <Testimonial />
        <Sectors />
        <Pricing />
        <Faq />
        <ClosingCta />
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
              <span>· Stealth mode default</span>
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
      <div className="v2-jsk-mcard-eye">YOUR TOP MATCH · TODAY</div>
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

function Benefits() {
  return (
    <section className="v2-jsk-sec">
      <div className="v2-container">
        <div className="v2-jsk-sec-head">
          <div>
            <div className="v2-eyebrow">What you get</div>
            <h2 className="v2-jsk-sec-h" style={{ marginTop: 16 }}>
              Six things every job board <em>should</em> do &mdash; and ours
              actually does.
            </h2>
          </div>
          <p className="v2-jsk-sec-lede">
            Built by people who&rsquo;ve worked Canadian energy hiring from
            both sides. No keyword spam, no salary mystery, no recruiter games.
          </p>
        </div>

        <div className="v2-jsk-ben">
          {BENEFITS.map((b) => (
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
            <div className="v2-eyebrow">Real moves</div>
            <h2 className="v2-jsk-sec-h" style={{ marginTop: 16 }}>
              Career arcs that <em>shouldn&rsquo;t</em> work &mdash; but did.
            </h2>
          </div>
          <p className="v2-jsk-sec-lede">
            Three placements from the last 90 days. Names changed, comp bands
            real, timelines real.
          </p>
        </div>

        <div className="v2-jsk-paths">
          {PATHS.map((p, i) => (
            <div
              key={i}
              className={`v2-jsk-path ${p.dark ? "dark" : ""}`}
            >
              <div className="v2-jsk-path-eye">{p.eye}</div>
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

function Skills() {
  return (
    <section className="v2-jsk-sec">
      <div className="v2-container">
        <div className="v2-jsk-skills">
          <div>
            <div className="v2-eyebrow">Verified skills</div>
            <h2 className="v2-jsk-sec-h" style={{ marginTop: 16 }}>
              Earn a <em>badge</em> recruiters actually weigh.
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
              Each Energized assessment is graded by working senior engineers
              in your sector &mdash; not generic test banks. Pass it once and
              the badge sits on your profile, visible to every recruiter you
              allow.
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
                    3.4&times;
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
                  Recruiter messages
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
                    22
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
                  Live assessments
                </div>
              </div>
            </div>
          </div>

          <div className="v2-jsk-skills-list">
            {SKILLS.map((s) => (
              <div key={s.nm} className="v2-jsk-skill">
                <div className="ic" style={{ background: s.c }}>
                  {s.mk}
                </div>
                <div>
                  <div className="nm">{s.nm}</div>
                  <div className="meta">{s.meta}</div>
                </div>
                <span className={`badge ${s.badge}`}>{s.label}</span>
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

function Sectors() {
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
            We staff oil sands and offshore wind in the same week. The
            transition is messy &mdash; pretending otherwise helps nobody.
          </p>
        </div>

        <div className="v2-jsk-sectors">
          {SECTORS.map((s) => (
            <Link
              key={s.h}
              href={`/jobs?sector=${encodeURIComponent(s.h)}`}
              className="v2-jsk-sector"
            >
              <div>
                <div
                  className="v2-jsk-sector-mk"
                  style={{ background: s.c }}
                >
                  {s.mk}
                </div>
                <h3 className="v2-jsk-sector-h">{s.h}</h3>
              </div>
              <div className="v2-jsk-sector-count">
                <em>{s.count}</em> open roles
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

function Pricing() {
  return (
    <section className="v2-jsk-sec">
      <div className="v2-container">
        <div className="v2-jsk-sec-head">
          <div>
            <div className="v2-eyebrow">Membership</div>
            <h2 className="v2-jsk-sec-h" style={{ marginTop: 16 }}>
              Free <em>forever</em>. Pro when you need it.
            </h2>
          </div>
          <p className="v2-jsk-sec-lede">
            The free tier is genuinely free &mdash; not a trial. Most members
            stay on it their entire job search.
          </p>
        </div>

        <div className="v2-jsk-price-grid">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`v2-jsk-price ${p.featured ? "featured" : ""}`}
            >
              {p.tag && <div className="v2-jsk-price-tag">{p.tag}</div>}
              <div className="v2-jsk-price-eye">
                {p.cost === 0 ? "Always free" : "Billed annually"}
              </div>
              <div className="v2-jsk-price-name">
                {p.name === "Pro" ? (
                  <>
                    P<em>ro</em>
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
                {p.cost === 0
                  ? "No card required"
                  : `Billed C$${p.cost * 12} yearly · cancel any time`}
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

              <Link href={p.href} className="v2-jsk-price-cta">
                {p.cta}
                <Icon name="arrowRight" size={14} />
              </Link>
            </div>
          ))}
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

function ClosingCta() {
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
          Takes about six minutes. Free forever, deletable any time. Stealth
          mode on by default.
        </p>
        <div className="v2-jsk-cta-actions">
          <Link href="/sign-up" className="v2-btn v2-btn-lg">
            Sign up free
            <Icon name="arrowRight" size={18} />
          </Link>
          <Link href="/jobs" className="v2-btn v2-btn-ghost v2-btn-lg">
            Browse 2,400 jobs first
          </Link>
        </div>
      </div>
    </section>
  );
}
