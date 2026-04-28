"use client";

import Link from "next/link";
import { Icon, type IconName } from "@/components/shared/icon";

type SectorEnum =
  | "oil_gas"
  | "renewables"
  | "nuclear"
  | "utilities"
  | "hydrogen"
  | "power"
  | "other";

type AvailabilityEnum =
  | "immediately"
  | "notice_2w"
  | "notice_4w"
  | "notice_3m"
  | "browsing";

type RemoteEnum = "on_site" | "hybrid" | "remote" | "flexible";

const SECTOR_LABELS: Record<SectorEnum, string> = {
  oil_gas: "Oil & Gas",
  renewables: "Renewable Energy",
  nuclear: "Nuclear",
  utilities: "Power Utilities",
  hydrogen: "Hydrogen",
  power: "Power",
  other: "Other",
};

const AVAILABILITY_LABELS: Record<AvailabilityEnum, string> = {
  immediately: "Available immediately",
  notice_2w: "2 weeks notice",
  notice_4w: "4 weeks notice",
  notice_3m: "3+ months",
  browsing: "Just browsing",
};

const REMOTE_LABELS: Record<RemoteEnum, string> = {
  on_site: "Onsite",
  hybrid: "Hybrid",
  remote: "Remote",
  flexible: "Flexible",
};

const COMPANY_COLORS = [
  "#2A303F",
  "#004984",
  "#1CAAE2",
  "#1F4E8C",
  "#0A8F7A",
  "#B8703C",
  "#6B3FA0",
  "#B01E1E",
];

function companyColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return COMPANY_COLORS[hash % COMPANY_COLORS.length];
}

const CERT_ICON: Record<string, IconName> = {
  p_eng: "graduationCap",
  h2s_alive: "zap",
  csts: "shield",
  red_seal: "check",
  nace: "shield",
  first_aid: "shield",
  fall_protection: "shield",
  other: "sparkles",
};

type PublicUser = {
  name: string;
  image: string | null;
  memberSince: Date;
};

type PublicProfile = {
  id: string;
  headline: string | null;
  summary: string | null;
  location: string | null;
  yearsExperience: number | null;
  skills: string[];
  openToWork: boolean;
  fifoRotational: boolean;
  availability: AvailabilityEnum | null;
  remotePreference: RemoteEnum | null;
  sectors: SectorEnum[];
};

type WorkItem = {
  id: string;
  employerName: string;
  roleTitle: string;
  site: string | null;
  sector: SectorEnum | null;
  summary: string | null;
  skills: string[];
  startedAt: Date;
  endedAt: Date | null;
};

type CertItem = {
  id: string;
  type: string;
  name: string;
  issuer: string | null;
  issuedAt: Date | null;
  expiresAt: Date | null;
};

type EducationItem = {
  id: string;
  school: string;
  degree: string | null;
  startedYear: string | null;
  endedYear: string | null;
  details: string | null;
};

export function PublicProfileClient({
  user,
  profile,
  work,
  certs,
  education,
  viewerIsSelf,
  viewerIsAuthed,
}: {
  user: PublicUser;
  profile: PublicProfile;
  work: WorkItem[];
  certs: CertItem[];
  education: EducationItem[];
  viewerIsSelf: boolean;
  viewerIsAuthed: boolean;
}) {
  const [firstName, lastName] = splitName(user.name);
  const initials = initialsOf(user.name);
  const showHiddenDetails = viewerIsAuthed || viewerIsSelf;

  return (
    <div className="pub-page">
      {/* viewer banner */}
      <div className="pub-viewer-bar">
        <Icon name="eye" size={14} />
        {viewerIsSelf ? (
          <span>
            Preview · <em>this is how your profile appears externally</em>
          </span>
        ) : viewerIsAuthed ? (
          <span>
            Viewing as <em>signed-in member</em> — request an intro to share
            contact info.
          </span>
        ) : (
          <span>
            Shared profile · public link — some details hidden until you
            <em> sign in</em>.
          </span>
        )}
      </div>

      {/* HERO */}
      <header className="pub-hero">
        <div>
          <div className="pub-eyebrow">
            <span className="pip" />
            {profile.headline ?? "Energy professional"}
            {profile.yearsExperience
              ? ` · ${profile.yearsExperience} yrs experience`
              : ""}
          </div>
          <h1 className="pub-name">
            {firstName}
            <br />
            <em>{lastName || "."}</em>
          </h1>
          {profile.summary && (
            <div className="pub-headline">{profile.summary}</div>
          )}

          <div className="pub-meta-strip">
            {profile.openToWork && (
              <span className="status-on">Open to new roles</span>
            )}
            {profile.location && (
              <span>
                <Icon name="mapPin" size={13} /> {profile.location}
              </span>
            )}
            {profile.availability && (
              <span>
                <Icon name="clock" size={13} />{" "}
                {AVAILABILITY_LABELS[profile.availability]}
              </span>
            )}
            {profile.remotePreference && (
              <span>
                <Icon name="building" size={13} />{" "}
                {REMOTE_LABELS[profile.remotePreference]}
              </span>
            )}
            {profile.fifoRotational && (
              <span>
                <Icon name="globe" size={13} /> Open to FIFO / rotational
              </span>
            )}
          </div>
        </div>

        <aside className="pub-id-card">
          <div className="pub-id-avatar">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt={user.name}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: "inherit",
                }}
              />
            ) : (
              <span>{initials || "?"}</span>
            )}
          </div>
          <div className="pub-id-name">{user.name || "Anonymous"}</div>
          <div className="pub-id-title">
            {profile.headline ?? "Energy professional"}
            {profile.location && (
              <>
                <br />
                {profile.location}
              </>
            )}
          </div>

          <div className="pub-id-divider" />

          {viewerIsSelf ? (
            <div className="pub-cta-stack">
              <Link
                className="pub-cta-primary"
                href="/profile"
                style={{ textDecoration: "none", display: "flex", gap: 8, alignItems: "center", justifyContent: "center" }}
              >
                Edit profile <Icon name="arrowRight" size={14} />
              </Link>
              <div className="pub-id-foot">
                <Icon name="shield" size={12} />
                <span>
                  This is a preview. Contact details are never exposed to
                  visitors — verified employers must request an intro.
                </span>
              </div>
            </div>
          ) : showHiddenDetails ? (
            <div className="pub-cta-stack">
              <button
                type="button"
                className="pub-cta-primary"
                disabled
                title="Intro requests are coming soon."
              >
                Request intro <Icon name="arrowRight" size={14} />
              </button>
              <button
                type="button"
                className="pub-cta-secondary"
                disabled
                title="Shortlists are coming soon."
              >
                <Icon name="bookmark" size={13} /> Save to shortlist
              </button>
              <div className="pub-id-foot">
                <Icon name="shield" size={12} />
                <span>
                  Contact info is hidden until {firstName || "the candidate"}{" "}
                  accepts your intro request.
                </span>
              </div>
            </div>
          ) : (
            <div className="pub-cta-stack">
              <Link
                className="pub-cta-primary"
                href="/sign-in"
                style={{ textDecoration: "none", display: "flex", gap: 8, alignItems: "center", justifyContent: "center" }}
              >
                <Icon name="lock" size={14} /> Sign in to see more
              </Link>
              <div className="pub-id-foot">
                <Icon name="shield" size={12} />
                <span>
                  {firstName || "This person"}&rsquo;s contact info is hidden
                  on public links. Verified employers can request an intro.
                </span>
              </div>
            </div>
          )}
        </aside>
      </header>

      <div className="pub-body">
        {/* pitch */}
        {profile.summary && (
          <section className="pub-section" style={{ borderTop: "none" }}>
            <div className="pub-section-head">
              <div className="pub-section-kicker">01 · In their own words</div>
              <div>
                <h2 className="pub-section-title">
                  The <em>elevator pitch.</em>
                </h2>
              </div>
            </div>
            <blockquote className="pub-pitch">{profile.summary}</blockquote>
          </section>
        )}

        {/* work history */}
        {work.length > 0 && (
          <section className="pub-section">
            <div className="pub-section-head">
              <div className="pub-section-kicker">02 · Work history</div>
              <div>
                <h2 className="pub-section-title">
                  {workSummaryTitle(profile.yearsExperience)}
                </h2>
                <p className="pub-section-lede">
                  {work.length} role{work.length === 1 ? "" : "s"} on file
                  {profile.sectors.length > 0
                    ? ` · ${profile.sectors.map((s) => SECTOR_LABELS[s]).join(", ")}`
                    : ""}
                </p>
              </div>
            </div>

            <div className="pub-work">
              {work.map((w) => (
                <article key={w.id} className="pub-work-item">
                  <div>
                    <div className="pub-work-when">
                      {formatMonth(w.startedAt)} —{" "}
                      {w.endedAt ? formatMonth(w.endedAt) : "Present"}
                    </div>
                    {!w.endedAt && (
                      <div className="pub-work-when-current">Current</div>
                    )}
                  </div>
                  <div>
                    <div className="pub-work-role">{w.roleTitle}</div>
                    <div className="pub-work-company">
                      <div
                        className="pub-work-logo"
                        style={{ background: companyColor(w.employerName) }}
                      >
                        {w.employerName.charAt(0).toUpperCase()}
                      </div>
                      <span>
                        <strong>{w.employerName}</strong>
                        {w.site ? ` · ${w.site}` : ""}
                      </span>
                    </div>
                    {w.summary && (
                      <p className="pub-work-body">{w.summary}</p>
                    )}
                    {w.skills.length > 0 && (
                      <div className="pub-work-chips">
                        {w.skills.map((s) => (
                          <span
                            key={s}
                            className="v2-chip v2-chip-outline"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* skills */}
        {profile.skills.length > 0 && (
          <section className="pub-section pub-section--skills">
            <div className="pub-section-head">
              <div className="pub-section-kicker">03 · Skills</div>
              <div>
                <h2 className="pub-section-title">
                  Tools on the <em>belt.</em>
                </h2>
                <p className="pub-section-lede">
                  {profile.skills.length} confirmed skills and tickets.
                </p>
              </div>
            </div>
            <div className="pub-skills">
              <div>
                <div className="pub-skills-heading">Confirmed skills</div>
                <div className="pub-skill-row">
                  {profile.skills.map((s) => (
                    <span key={s} className="pub-skill-primary">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* certifications */}
        {certs.length > 0 && (
          <section className="pub-section">
            <div className="pub-section-head">
              <div className="pub-section-kicker">
                04 · Certifications &amp; tickets
              </div>
              <div>
                <h2 className="pub-section-title">
                  All <em>current.</em>
                </h2>
                <p className="pub-section-lede">
                  Energized reminds{" "}
                  {firstName || "the candidate"} and you before anything
                  lapses.
                </p>
              </div>
            </div>
            <div className="pub-certs">
              {certs.map((c) => (
                <div key={c.id} className="pub-cert">
                  <div className="pub-cert-ico">
                    <Icon
                      name={CERT_ICON[c.type] ?? "shield"}
                      size={20}
                    />
                  </div>
                  <div>
                    <div className="pub-cert-name">{c.name}</div>
                    <div className="pub-cert-issuer">
                      {c.issuer ?? "Unknown issuer"}
                      {c.issuedAt && ` · Issued ${c.issuedAt.getFullYear()}`}
                    </div>
                  </div>
                  <div className="pub-cert-expiry">
                    {c.expiresAt
                      ? `UNTIL ${formatMonthUpper(c.expiresAt)}`
                      : "NO EXPIRY"}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* education */}
        {education.length > 0 && (
          <section className="pub-section">
            <div className="pub-section-head">
              <div className="pub-section-kicker">05 · Education</div>
              <div>
                <h2 className="pub-section-title">School.</h2>
              </div>
            </div>
            {education.map((e) => (
              <div key={e.id} className="pub-edu">
                <div className="pub-edu-years">
                  {formatEduYears(e.startedYear, e.endedYear)}
                </div>
                <div>
                  <div className="pub-edu-school">{e.school}</div>
                  {e.degree && (
                    <div className="pub-edu-degree">{e.degree}</div>
                  )}
                  {e.details && (
                    <div className="pub-edu-detail">{e.details}</div>
                  )}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* empty-state sections for features coming later */}
        {work.length === 0 &&
          profile.skills.length === 0 &&
          certs.length === 0 &&
          education.length === 0 && (
            <section className="pub-section" style={{ borderTop: "none" }}>
              <div className="pub-section-head">
                <div className="pub-section-kicker">Profile in progress</div>
                <div>
                  <h2 className="pub-section-title">
                    {firstName || "This user"} is still building their
                    profile.
                  </h2>
                  <p className="pub-section-lede">
                    Check back soon — work history, skills, and tickets will
                    appear here.
                  </p>
                </div>
              </div>
            </section>
          )}
      </div>

      {/* footer */}
      <div className="pub-foot">
        <div>
          Last updated <em>{formatDate(user.memberSince)}</em> · Powered by
          Energized
        </div>
        <div>Profile id · {profile.id.slice(0, 12)}</div>
      </div>

      {/* sticky mobile CTA */}
      {!viewerIsSelf && (
        <div className="pub-sticky-cta">
          {viewerIsAuthed ? (
            <button
              type="button"
              className="pub-cta-primary"
              style={{ flex: 1 }}
              disabled
              title="Coming soon"
            >
              Request intro <Icon name="arrowRight" size={14} />
            </button>
          ) : (
            <Link
              href="/sign-in"
              className="pub-cta-primary"
              style={{
                flex: 1,
                textDecoration: "none",
                display: "flex",
                gap: 8,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="lock" size={14} /> Sign in to see more
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- helpers ---------- */

function splitName(full: string): [string, string] {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 0 || parts[0] === "") return ["", ""];
  const first = parts.shift() ?? "";
  return [first, parts.join(" ")];
}

function initialsOf(full: string): string {
  return full
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function formatMonth(d: Date): string {
  return d.toLocaleString("en-US", { month: "short", year: "numeric" });
}

function formatMonthUpper(d: Date): string {
  return d
    .toLocaleString("en-US", { month: "short", year: "numeric" })
    .toUpperCase();
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatEduYears(
  startedYear: string | null,
  endedYear: string | null,
): string {
  if (startedYear && endedYear) return `${startedYear} – ${endedYear}`;
  if (startedYear && !endedYear) return `${startedYear} – Present`;
  if (!startedYear && endedYear) return `Graduated ${endedYear}`;
  return "—";
}

function workSummaryTitle(years: number | null): React.ReactNode {
  if (!years || years < 2) {
    return (
      <>
        Getting started in <em>energy.</em>
      </>
    );
  }
  return (
    <>
      {years} years across <em>energy.</em>
    </>
  );
}
