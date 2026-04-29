import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { and, desc, eq, inArray, notInArray, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  applications,
  employerOrgs,
  jobListings,
  profiles,
  savedJobs,
  workHistory,
} from "@/server/db/schema";
import { getSession } from "@/server/auth";
import { countJobseekerProfileViews30d } from "@/server/services/profile-views";
import { Icon } from "@/components/shared/icon";
import { SiteHeader } from "@/components/marketing/site-header";
import {
  formatSalary,
  type JobSector,
} from "@/lib/jobs-options";
import {
  STAGE_FROM_DB,
  STAGE_LABEL,
  STAGE_STEP,
  STAGE_TOTAL,
  type StageKey,
} from "@/lib/application-stages";
import { timeAgo } from "@/lib/time";

export const metadata: Metadata = { title: "Dashboard — Energized" };

/* ---------- page ---------- */

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in?redirect=/dashboard");
  if (session.user.role === "employer") redirect("/employer");

  const userId = session.user.id;

  // --- profile + completeness ----------
  const [p] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);

  const wh = p
    ? await db
        .select({ id: workHistory.id })
        .from(workHistory)
        .where(eq(workHistory.profileId, p.id))
        .limit(1)
    : [];

  const profileChecks = [
    { label: "Headline & summary", done: Boolean(p?.headline?.trim()) },
    { label: "Sectors picked", done: (p?.sectors.length ?? 0) > 0 },
    { label: "Work history (1+ role)", done: wh.length > 0 },
    { label: "Skills tagged", done: (p?.skills.length ?? 0) > 0 },
    { label: "Resume uploaded", done: Boolean(p?.resumeUrl) },
    { label: "Location & relocation prefs", done: Boolean(p?.location) },
  ];
  const doneCount = profileChecks.filter((c) => c.done).length;
  const completeness = Math.round((doneCount / profileChecks.length) * 100);

  // --- applications (full list, with org join) ----------
  const allApps = await db
    .select({
      id: applications.id,
      status: applications.status,
      createdAt: applications.createdAt,
      jobId: applications.jobId,
      jobTitle: jobListings.title,
      jobLocation: jobListings.location,
      salaryMin: jobListings.salaryMin,
      salaryMax: jobListings.salaryMax,
      salaryCurrency: jobListings.salaryCurrency,
      salaryPeriod: jobListings.salaryPeriod,
      orgName: employerOrgs.name,
      orgLogoColor: employerOrgs.logoColor,
      orgLogoUrl: employerOrgs.logoUrl,
    })
    .from(applications)
    .innerJoin(jobListings, eq(jobListings.id, applications.jobId))
    .innerJoin(employerOrgs, eq(employerOrgs.id, jobListings.orgId))
    .where(eq(applications.candidateId, userId))
    .orderBy(desc(applications.createdAt));

  const stagedApps = allApps.map((a) => ({
    ...a,
    stage: STAGE_FROM_DB[a.status] ?? "applied",
  }));

  const activeStages: StageKey[] = ["applied", "review", "interview"];
  const activeApps = stagedApps.filter((a) => activeStages.includes(a.stage));
  const offerApps = stagedApps.filter((a) => a.stage === "offer");
  const rejectedApps = stagedApps.filter((a) => a.stage === "rejected");

  const appsCount = stagedApps.length;
  const activeCount = activeApps.length;
  const offerCount = offerApps.length;
  const inProgressApps = activeApps.slice(0, 5);

  // --- saved ----------
  const recentSaved = await db
    .select({
      id: savedJobs.id,
      jobId: jobListings.id,
      jobTitle: jobListings.title,
      jobLocation: jobListings.location,
      sector: jobListings.sector,
      salaryMin: jobListings.salaryMin,
      salaryMax: jobListings.salaryMax,
      salaryCurrency: jobListings.salaryCurrency,
      salaryPeriod: jobListings.salaryPeriod,
      orgName: employerOrgs.name,
      orgLogoColor: employerOrgs.logoColor,
      orgLogoUrl: employerOrgs.logoUrl,
    })
    .from(savedJobs)
    .innerJoin(jobListings, eq(jobListings.id, savedJobs.jobId))
    .innerJoin(employerOrgs, eq(employerOrgs.id, jobListings.orgId))
    .where(eq(savedJobs.userId, userId))
    .orderBy(desc(savedJobs.createdAt))
    .limit(4);

  const [savedCountRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(savedJobs)
    .where(eq(savedJobs.userId, userId));
  const savedCount = savedCountRow?.count ?? 0;

  // --- profile views ----------
  const profileViews30d = await countJobseekerProfileViews30d(userId);

  // --- recommended ----------
  const appliedIdsRows = await db
    .select({ id: applications.jobId })
    .from(applications)
    .where(eq(applications.candidateId, userId));
  const savedIdsRows = await db
    .select({ id: savedJobs.jobId })
    .from(savedJobs)
    .where(eq(savedJobs.userId, userId));
  const excludeIds = [
    ...appliedIdsRows.map((r) => r.id),
    ...savedIdsRows.map((r) => r.id),
  ];

  const sectorPrefs = (p?.sectors ?? []) as JobSector[];
  const recommendedConditions = [eq(jobListings.status, "published")];
  if (sectorPrefs.length > 0) {
    recommendedConditions.push(inArray(jobListings.sector, sectorPrefs));
  }
  if (excludeIds.length > 0) {
    recommendedConditions.push(notInArray(jobListings.id, excludeIds));
  }
  const recommended = await db
    .select({
      id: jobListings.id,
      jobTitle: jobListings.title,
      jobLocation: jobListings.location,
      sector: jobListings.sector,
      salaryMin: jobListings.salaryMin,
      salaryMax: jobListings.salaryMax,
      salaryCurrency: jobListings.salaryCurrency,
      salaryPeriod: jobListings.salaryPeriod,
      publishedAt: jobListings.publishedAt,
      orgName: employerOrgs.name,
      orgLogoColor: employerOrgs.logoColor,
      orgLogoUrl: employerOrgs.logoUrl,
    })
    .from(jobListings)
    .innerJoin(employerOrgs, eq(employerOrgs.id, jobListings.orgId))
    .where(and(...recommendedConditions)!)
    .orderBy(desc(jobListings.publishedAt))
    .limit(4);

  // --- focus card derivation ----------
  // priority: latest offer > latest interview > "browse roles"
  const focusOffer = offerApps[0] ?? null;
  const focusInterview = stagedApps.find((a) => a.stage === "interview") ?? null;

  const firstName = session.user.name?.split(" ")[0] ?? "there";
  const today = new Date().toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // status copy line under greeting
  const statusBits: string[] = [];
  if (offerCount > 0) {
    statusBits.push(
      `${offerCount} offer${offerCount === 1 ? "" : "s"} to review`,
    );
  }
  if (activeCount > 0) {
    statusBits.push(
      `${activeCount} application${activeCount === 1 ? "" : "s"} in flight`,
    );
  }
  if (recommended.length > 0) {
    statusBits.push(
      `${recommended.length} fresh role${recommended.length === 1 ? "" : "s"} for you`,
    );
  }
  const statusLine =
    statusBits.length > 0
      ? statusBits.join(" · ")
      : "No applications yet — let's find your first match.";

  return (
    <>
      <SiteHeader active="dashboard" />
      <div className="v2-dash">
        <div className="v2-container">
          {/* HEADER */}
          <div className="v2-dash-head">
            <div>
              <div className="v2-eyebrow">{today}</div>
              <h1 className="v2-dash-greeting">
                Welcome back, <em>{firstName}</em>.
              </h1>
              <p className="v2-dash-sub">{statusLine}</p>
            </div>
            <FocusCard
              offer={focusOffer}
              interview={focusInterview}
              recommendedCount={recommended.length}
            />
          </div>

          {/* SUB-NAV */}
          <div className="v2-dash-subnav">
            <span className="v2-dash-subnav-link active">Overview</span>
            <Link href="/applications" className="v2-dash-subnav-link">
              Applications
              {activeCount > 0 && (
                <span className="v2-pipeline-count">{activeCount}</span>
              )}
            </Link>
            <Link href="/saved" className="v2-dash-subnav-link">
              Saved roles
              {savedCount > 0 && (
                <span className="v2-pipeline-count">{savedCount}</span>
              )}
            </Link>
            <Link href="/profile" className="v2-dash-subnav-link">
              Profile
            </Link>
          </div>

          {/* STAT STRIP */}
          <div className="v2-stat-strip">
            <StatCard
              num={appsCount}
              label="Applications"
              icon="send"
              meta={`${activeCount} active · ${offerCount} offer${offerCount === 1 ? "" : "s"}`}
            />
            <StatCard
              num={savedCount}
              label="Saved roles"
              icon="bookmark"
              meta={
                savedCount === 0
                  ? "Bookmark roles to track them"
                  : `${savedCount} on your shortlist`
              }
            />
            <StatCard
              num={profileViews30d}
              label="Profile views"
              icon="eye"
              meta="Last 30 days"
            />
            <StatCard
              num={`${completeness}%`}
              label="Profile strength"
              icon="user"
              meta={
                completeness === 100
                  ? "Recruiter-ready"
                  : `${profileChecks.length - doneCount} step${profileChecks.length - doneCount === 1 ? "" : "s"} to go`
              }
            />
          </div>

          {/* MAIN GRID */}
          <div className="v2-dash-grid">
            {/* LEFT COLUMN */}
            <div style={{ display: "grid", gap: 24 }}>
              {/* Applications pipeline */}
              <section className="v2-card">
                <div className="v2-card-head">
                  <div>
                    <div className="v2-eyebrow">Applications</div>
                    <h2 className="v2-card-title" style={{ marginTop: 8 }}>
                      Your <em>pipeline</em>
                    </h2>
                  </div>
                  <Link href="/applications" className="v2-card-link">
                    View all <Icon name="arrowRight" size={14} />
                  </Link>
                </div>

                <div className="v2-pipeline-tabs">
                  <span className="v2-pipeline-tab active">
                    In progress
                    <span className="v2-pipeline-count">{activeCount}</span>
                  </span>
                  <span className="v2-pipeline-tab">
                    Offers
                    <span className="v2-pipeline-count">{offerCount}</span>
                  </span>
                  <span className="v2-pipeline-tab">
                    Archive
                    <span className="v2-pipeline-count">
                      {rejectedApps.length}
                    </span>
                  </span>
                  <span className="v2-pipeline-tab">
                    All
                    <span className="v2-pipeline-count">{appsCount}</span>
                  </span>
                </div>

                <div className="v2-app-list">
                  {inProgressApps.length === 0 ? (
                    <div
                      style={{
                        padding: "40px 0",
                        textAlign: "center",
                        color: "var(--v2-ink-500)",
                      }}
                    >
                      No active applications.{" "}
                      <Link
                        href="/jobs"
                        style={{
                          color: "var(--v2-accent-deep)",
                          fontWeight: 600,
                        }}
                      >
                        Browse roles →
                      </Link>
                    </div>
                  ) : (
                    inProgressApps.map((a) => (
                      <ApplicationRow key={a.id} a={a} />
                    ))
                  )}
                </div>
              </section>

              {/* Recommended */}
              <section className="v2-card">
                <div className="v2-card-head">
                  <div>
                    <div className="v2-eyebrow">For you</div>
                    <h2 className="v2-card-title" style={{ marginTop: 8 }}>
                      Roles <em>you&rsquo;d love</em>
                    </h2>
                  </div>
                  <Link href="/jobs" className="v2-card-link">
                    Browse all <Icon name="arrowRight" size={14} />
                  </Link>
                </div>
                {recommended.length === 0 ? (
                  <div
                    style={{
                      marginTop: 24,
                      padding: 32,
                      border: "1px dashed var(--v2-ink-200)",
                      borderRadius: "var(--v2-r-lg)",
                      textAlign: "center",
                      color: "var(--v2-ink-500)",
                    }}
                  >
                    Pick sectors on your profile to unlock personalized recs.
                  </div>
                ) : (
                  <div className="v2-rec-grid">
                    {recommended.map((r) => (
                      <RecCard key={r.id} r={r} />
                    ))}
                  </div>
                )}
              </section>

              {/* Saved roles preview */}
              <section className="v2-card">
                <div className="v2-card-head">
                  <div>
                    <div className="v2-eyebrow">Saved</div>
                    <h2 className="v2-card-title" style={{ marginTop: 8 }}>
                      Your <em>shortlist</em>
                    </h2>
                  </div>
                  <Link href="/saved" className="v2-card-link">
                    See all {savedCount} <Icon name="arrowRight" size={14} />
                  </Link>
                </div>
                {recentSaved.length === 0 ? (
                  <div
                    style={{
                      marginTop: 18,
                      padding: 24,
                      border: "1px dashed var(--v2-ink-200)",
                      borderRadius: "var(--v2-r-lg)",
                      textAlign: "center",
                      color: "var(--v2-ink-500)",
                      fontSize: 13,
                    }}
                  >
                    Bookmark roles from any job page to build your shortlist.
                  </div>
                ) : (
                  <div className="v2-saved-list">
                    {recentSaved.map((s) => (
                      <Link
                        key={s.id}
                        href={`/jobs/${s.jobId}`}
                        className="v2-saved-row"
                        style={{ color: "inherit" }}
                      >
                        <div
                          className="v2-saved-logo"
                          style={{ background: s.orgLogoColor }}
                        >
                          {s.orgName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="v2-saved-title">
                            {s.jobTitle ?? "Untitled role"}
                          </div>
                          <div className="v2-saved-meta">
                            {s.orgName}
                            {s.jobLocation && ` · ${s.jobLocation}`}
                          </div>
                        </div>
                        <span
                          className="v2-saved-match"
                          style={{
                            background: "var(--v2-ink-100)",
                            color: "var(--v2-ink-700)",
                          }}
                        >
                          {formatSalary(
                            s.salaryMin,
                            s.salaryMax,
                            s.salaryCurrency,
                            s.salaryPeriod,
                          )}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* RIGHT RAIL */}
            <aside className="v2-rail">
              <ProfileCompletenessCard
                pct={completeness}
                checks={profileChecks}
              />
              <ActivityCard
                applications={stagedApps.slice(0, 4)}
                profileViews30d={profileViews30d}
                savedCount={savedCount}
              />
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------- focus card ---------- */

type StagedApp = {
  id: string;
  jobId: string;
  jobTitle: string | null;
  orgName: string;
  stage: StageKey;
};

function FocusCard({
  offer,
  interview,
  recommendedCount,
}: {
  offer: StagedApp | null;
  interview: StagedApp | null;
  recommendedCount: number;
}) {
  if (offer) {
    return (
      <div className="v2-focus-card">
        <div className="v2-focus-eye">This week&rsquo;s focus</div>
        <div className="v2-focus-headline">
          Decide on the <em>{offer.orgName}</em> offer for{" "}
          <em>{offer.jobTitle}</em>.
        </div>
        <div className="v2-focus-actions">
          <Link
            href={`/jobs/${offer.jobId}`}
            className="v2-btn v2-btn-accent"
          >
            Review offer
          </Link>
          <Link href="/applications" className="v2-btn-ghost-dark">
            <Icon name="message" size={14} />
            See pipeline
          </Link>
        </div>
      </div>
    );
  }
  if (interview) {
    return (
      <div className="v2-focus-card">
        <div className="v2-focus-eye">This week&rsquo;s focus</div>
        <div className="v2-focus-headline">
          Prep for the <em>{interview.orgName}</em> interview.
        </div>
        <div className="v2-focus-actions">
          <Link
            href={`/jobs/${interview.jobId}`}
            className="v2-btn v2-btn-accent"
          >
            View role
          </Link>
          <Link href="/applications" className="v2-btn-ghost-dark">
            <Icon name="bookOpen" size={14} />
            Pipeline
          </Link>
        </div>
      </div>
    );
  }
  return (
    <div className="v2-focus-card">
      <div className="v2-focus-eye">This week&rsquo;s focus</div>
      <div className="v2-focus-headline">
        {recommendedCount > 0
          ? "Apply to your top match this week."
          : "Build your profile so Ember can match you."}
      </div>
      <div className="v2-focus-actions">
        <Link
          href={recommendedCount > 0 ? "/jobs" : "/profile"}
          className="v2-btn v2-btn-accent"
        >
          {recommendedCount > 0 ? "Browse roles" : "Finish profile"}
        </Link>
      </div>
    </div>
  );
}

/* ---------- stat card ---------- */

function StatCard({
  num,
  label,
  icon,
  meta,
}: {
  num: number | string;
  label: string;
  icon: React.ComponentProps<typeof Icon>["name"];
  meta: string;
}) {
  return (
    <div className="v2-stat">
      <div className="v2-stat-num-row">
        <div className="v2-stat-num">{num}</div>
      </div>
      <div className="v2-stat-label-row">
        <div className="v2-stat-icon">
          <Icon name={icon} size={16} />
        </div>
        <div>
          <div className="v2-stat-label">{label}</div>
          <div className="v2-stat-meta">{meta}</div>
        </div>
      </div>
    </div>
  );
}

/* ---------- application row ---------- */

function ApplicationRow({
  a,
}: {
  a: {
    id: string;
    jobId: string;
    jobTitle: string | null;
    jobLocation: string | null;
    salaryMin: number | null;
    salaryMax: number | null;
    salaryCurrency: string | null;
    salaryPeriod: string | null;
    createdAt: Date;
    orgName: string;
    orgLogoColor: string;
    stage: StageKey;
  };
}) {
  const step = STAGE_STEP[a.stage];
  const segs = Array.from({ length: STAGE_TOTAL }, (_, i) => {
    if (i < step - 1) return "done";
    if (i === step - 1) return "active";
    return "";
  });
  return (
    <Link
      href={`/jobs/${a.jobId}`}
      className="v2-app-row"
      style={{ color: "inherit" }}
    >
      <div
        className="v2-app-logo"
        style={{ background: a.orgLogoColor }}
      >
        {a.orgName.slice(0, 2).toUpperCase()}
      </div>
      <div>
        <div className="v2-app-title">{a.jobTitle ?? "Untitled role"}</div>
        <div className="v2-app-meta">
          <span>{a.orgName}</span>
          {a.jobLocation && (
            <span className="v2-app-meta-dot">{a.jobLocation}</span>
          )}
          <span className="v2-app-meta-dot">
            {formatSalary(
              a.salaryMin,
              a.salaryMax,
              a.salaryCurrency,
              a.salaryPeriod,
            )}
          </span>
        </div>
        <div className="v2-app-progress">
          {segs.map((s, i) => (
            <div key={i} className={`v2-app-progress-bar ${s}`} />
          ))}
        </div>
      </div>
      <div>
        <span className={`v2-app-stage ${a.stage}`}>
          {STAGE_LABEL[a.stage]}
        </span>
      </div>
      <div className="v2-app-time">
        Applied
        <br />
        {timeAgo(a.createdAt)}
      </div>
    </Link>
  );
}

/* ---------- recommended card ---------- */

function RecCard({
  r,
}: {
  r: {
    id: string;
    jobTitle: string | null;
    jobLocation: string | null;
    salaryMin: number | null;
    salaryMax: number | null;
    salaryCurrency: string | null;
    salaryPeriod: string | null;
    publishedAt: Date | null;
    orgName: string;
    orgLogoColor: string;
  };
}) {
  return (
    <Link
      href={`/jobs/${r.id}`}
      className="v2-rec"
      style={{ color: "inherit", display: "block" }}
    >
      <div className="v2-rec-head">
        <div className="v2-rec-logo" style={{ background: r.orgLogoColor }}>
          {r.orgName.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <div
            style={{
              fontSize: 12,
              fontFamily: "var(--v2-font-mono)",
              color: "var(--v2-ink-400)",
            }}
          >
            {r.publishedAt ? timeAgo(r.publishedAt) : "New"}
          </div>
          <div className="v2-rec-co">{r.orgName}</div>
        </div>
      </div>
      <div className="v2-rec-title">{r.jobTitle ?? "Untitled role"}</div>
      <div className="v2-rec-meta">
        <span>{r.jobLocation ?? "Location TBD"}</span>
        <span style={{ color: "var(--v2-ink-300)" }}>·</span>
        <span>
          {formatSalary(
            r.salaryMin,
            r.salaryMax,
            r.salaryCurrency,
            r.salaryPeriod,
          )}
        </span>
      </div>
      <div className="v2-rec-bottom">
        <div>
          <div className="v2-rec-why">Matches your sectors</div>
        </div>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            background: "var(--v2-accent)",
            color: "var(--v2-ink-950)",
          }}
        >
          <Icon name="arrowUpRight" size={14} />
        </div>
      </div>
    </Link>
  );
}

/* ---------- profile completeness ---------- */

function ProfileCompletenessCard({
  pct,
  checks,
}: {
  pct: number;
  checks: { label: string; done: boolean }[];
}) {
  const r = 38;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="v2-prof-card">
      <div className="v2-prof-row">
        <div className="v2-prof-ring">
          <svg viewBox="0 0 88 88">
            <circle
              className="v2-prof-ring-bg"
              cx="44"
              cy="44"
              r={r}
              fill="none"
              strokeWidth="6"
            />
            <circle
              className="v2-prof-ring-fg"
              cx="44"
              cy="44"
              r={r}
              fill="none"
              strokeWidth="6"
              strokeDasharray={c}
              strokeDashoffset={offset}
              strokeLinecap="round"
            />
          </svg>
          <div className="v2-prof-ring-num">{pct}%</div>
        </div>
        <div>
          <div className="v2-prof-eye">Profile strength</div>
          <div className="v2-prof-headline">
            {pct === 100
              ? "Recruiter-ready."
              : `${checks.filter((c) => !c.done).length} step${
                  checks.filter((c) => !c.done).length === 1 ? "" : "s"
                } from being recruiter-ready.`}
          </div>
        </div>
      </div>
      <div className="v2-prof-checks">
        {checks.map((c) => (
          <div
            key={c.label}
            className={`v2-prof-check ${c.done ? "" : "todo"}`}
          >
            <span className="v2-prof-check-tick">
              {c.done ? <Icon name="check" size={11} /> : null}
            </span>
            {c.label}
          </div>
        ))}
      </div>
      <Link href="/profile" className="v2-prof-cta">
        {pct === 100 ? "Edit profile" : "Finish profile"}
        <Icon name="arrowRight" size={14} />
      </Link>
    </div>
  );
}

/* ---------- derived activity feed ---------- */

type ActivityItem = {
  id: string;
  icon: React.ComponentProps<typeof Icon>["name"];
  tone: "default" | "accent" | "dark" | "sky" | "coral";
  text: React.ReactNode;
  time: string;
};

function ActivityCard({
  applications,
  profileViews30d,
  savedCount,
}: {
  applications: {
    id: string;
    createdAt: Date;
    jobTitle: string | null;
    orgName: string;
    stage: StageKey;
  }[];
  profileViews30d: number;
  savedCount: number;
}) {
  const items: ActivityItem[] = [];

  if (profileViews30d > 0) {
    items.push({
      id: "views",
      icon: "eye",
      tone: "accent",
      text: (
        <>
          <strong>{profileViews30d}</strong> profile view
          {profileViews30d === 1 ? "" : "s"} in the last 30 days.
        </>
      ),
      time: "this month",
    });
  }
  applications.slice(0, 4).forEach((a) => {
    items.push({
      id: `app-${a.id}`,
      icon: a.stage === "offer" ? "star" : "briefcase",
      tone: a.stage === "offer" ? "dark" : "default",
      text: (
        <>
          {a.stage === "offer"
            ? "Offer received from "
            : a.stage === "interview"
              ? "Interview booked with "
              : a.stage === "review"
                ? "Application moved to review at "
                : "Applied to "}
          <strong>{a.orgName}</strong>
          {a.jobTitle ? ` for ${a.jobTitle}` : ""}.
        </>
      ),
      time: timeAgo(a.createdAt),
    });
  });
  if (savedCount > 0) {
    items.push({
      id: "saved",
      icon: "bookmark",
      tone: "sky",
      text: (
        <>
          <strong>{savedCount}</strong> role{savedCount === 1 ? "" : "s"} on
          your shortlist.
        </>
      ),
      time: "now",
    });
  }
  if (items.length === 0) {
    items.push({
      id: "empty",
      icon: "sparkles",
      tone: "default",
      text: <>No activity yet — apply to your first role to get started.</>,
      time: "—",
    });
  }

  return (
    <div className="v2-card compact">
      <div className="v2-card-head">
        <div>
          <div className="v2-eyebrow">Activity</div>
          <h3
            className="v2-card-title"
            style={{ marginTop: 8, fontSize: 22 }}
          >
            Recent
          </h3>
        </div>
      </div>
      <div className="v2-notif-list">
        {items.map((n) => (
          <div key={n.id} className="v2-notif">
            <div className={`v2-notif-dot ${n.tone}`}>
              <Icon name={n.icon} size={12} />
            </div>
            <div>
              <div className="v2-notif-text">{n.text}</div>
              <div className="v2-notif-time">{n.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
