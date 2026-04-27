import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
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
import {
  SECTOR_LABELS,
  WORK_SETUP_LABELS,
  formatSalary,
  type JobSector,
  type JobWorkSetup,
} from "@/lib/jobs-options";

export const metadata: Metadata = { title: "Dashboard — Energized" };

const STATUS_CHIP: Record<string, string> = {
  submitted: "v2-chip-outline",
  reviewed: "v2-chip-outline",
  interview: "v2-chip-outline",
  offer: "v2-chip-accent",
  rejected: "v2-chip-coral",
};
const STATUS_LABEL: Record<string, string> = {
  submitted: "Submitted",
  reviewed: "Reviewed",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
};

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in?redirect=/dashboard");
  if (session.user.role === "employer") redirect("/employer/profile");

  const userId = session.user.id;

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

  const completeness = (() => {
    if (!p) return 0;
    let score = 0;
    if (p.headline?.trim()) score++;
    if (p.sectors.length > 0) score++;
    if (wh.length > 0) score++;
    if (p.resumeUrl) score++;
    if (p.skills.length > 0) score++;
    return Math.round((score / 5) * 100);
  })();

  const recentApplications = await db
    .select({
      id: applications.id,
      status: applications.status,
      createdAt: applications.createdAt,
      jobId: applications.jobId,
      jobTitle: jobListings.title,
      orgName: employerOrgs.name,
      orgLogoColor: employerOrgs.logoColor,
      orgLogoUrl: employerOrgs.logoUrl,
    })
    .from(applications)
    .innerJoin(jobListings, eq(jobListings.id, applications.jobId))
    .innerJoin(employerOrgs, eq(employerOrgs.id, jobListings.orgId))
    .where(eq(applications.candidateId, userId))
    .orderBy(desc(applications.createdAt))
    .limit(3);

  const [appsCountRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(applications)
    .where(eq(applications.candidateId, userId));
  const appsCount = appsCountRow?.count ?? 0;

  const recentSaved = await db
    .select({
      id: savedJobs.id,
      jobId: jobListings.id,
      jobTitle: jobListings.title,
      jobLocation: jobListings.location,
      sector: jobListings.sector,
      workSetup: jobListings.workSetup,
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

  const profileViews30d = await countJobseekerProfileViews30d(userId);

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
      jobId: jobListings.id,
      jobTitle: jobListings.title,
      jobLocation: jobListings.location,
      sector: jobListings.sector,
      workSetup: jobListings.workSetup,
      salaryMin: jobListings.salaryMin,
      salaryMax: jobListings.salaryMax,
      salaryCurrency: jobListings.salaryCurrency,
      salaryPeriod: jobListings.salaryPeriod,
      orgName: employerOrgs.name,
      orgLogoColor: employerOrgs.logoColor,
      orgLogoUrl: employerOrgs.logoUrl,
    })
    .from(jobListings)
    .innerJoin(employerOrgs, eq(employerOrgs.id, jobListings.orgId))
    .where(and(...recommendedConditions)!)
    .orderBy(desc(jobListings.publishedAt))
    .limit(4);

  const firstName = session.user.name?.split(" ")[0] ?? "there";

  return (
    <div
      className="v2"
      style={{ minHeight: "100vh", background: "var(--v2-ink-50)" }}
    >
      <header
        style={{
          padding: "20px 32px",
          background: "rgba(249,250,252,0.85)",
          backdropFilter: "saturate(180%) blur(14px)",
          WebkitBackdropFilter: "saturate(180%) blur(14px)",
          borderBottom: "1px solid var(--v2-ink-200)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 30,
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center" }}>
          <Image
            src="/energized-logo.svg"
            alt="Energized"
            width={144}
            height={80}
            priority
            style={{ height: 36, width: "auto" }}
          />
        </Link>
        <nav
          style={{
            display: "flex",
            gap: 20,
            alignItems: "center",
            fontSize: 14,
          }}
        >
          <Link href="/jobs" style={{ color: "var(--v2-ink-700)" }}>
            Jobs
          </Link>
          <Link href="/saved" style={{ color: "var(--v2-ink-700)" }}>
            Saved
          </Link>
          <Link href="/applications" style={{ color: "var(--v2-ink-700)" }}>
            Applications
          </Link>
          <Link
            href="/dashboard"
            style={{ color: "var(--v2-ink-900)", fontWeight: 700 }}
          >
            Dashboard
          </Link>
        </nav>
      </header>

      <div
        className="v2-container"
        style={{ paddingTop: 48, paddingBottom: 80, maxWidth: 960 }}
      >
        <div className="v2-eyebrow">Welcome back</div>
        <h1
          className="v2-h2"
          style={{
            fontStyle: "italic",
            fontWeight: 900,
            marginTop: 14,
            marginBottom: 28,
          }}
        >
          Hey, {firstName}.
        </h1>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
            marginBottom: 32,
          }}
        >
          <KpiTile label="Applications" value={String(appsCount)} sub="total" />
          <KpiTile label="Saved roles" value={String(savedCount)} sub="now" />
          <KpiTile
            label="Profile views"
            value={String(profileViews30d)}
            sub="last 30 days"
          />
          <KpiTile
            label="Profile"
            value={`${completeness}%`}
            sub={completeness === 100 ? "complete" : "finish →"}
            href="/profile"
          />
        </div>

        <Section
          title="Recent applications"
          seeAllHref="/applications"
          empty={
            recentApplications.length === 0
              ? {
                  title: "No applications yet.",
                  body: "Browse roles and apply.",
                  cta: { label: "Browse jobs", href: "/jobs" },
                }
              : null
          }
        >
          <div style={{ display: "grid", gap: 10 }}>
            {recentApplications.map((a) => (
              <Link
                key={a.id}
                href={`/jobs/${a.jobId}`}
                style={listRowStyle}
              >
                <Avatar
                  text={a.orgName.charAt(0).toUpperCase()}
                  imageUrl={a.orgLogoUrl}
                  bg={a.orgLogoColor}
                  size={36}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    {a.jobTitle ?? "Untitled role"}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--v2-ink-500)" }}>
                    {a.orgName} · Applied{" "}
                    {new Date(a.createdAt).toLocaleDateString("en-CA", {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                </div>
                <span className={`v2-chip ${STATUS_CHIP[a.status] ?? ""}`}>
                  {STATUS_LABEL[a.status] ?? a.status}
                </span>
              </Link>
            ))}
          </div>
        </Section>

        <Section
          title="Saved roles"
          seeAllHref="/saved"
          empty={
            recentSaved.length === 0
              ? {
                  title: "Nothing saved yet.",
                  body: "Bookmark roles from any job page.",
                  cta: { label: "Browse jobs", href: "/jobs" },
                }
              : null
          }
        >
          <div style={{ display: "grid", gap: 10 }}>
            {recentSaved.map((j) => (
              <JobMiniCard key={j.id} row={j} />
            ))}
          </div>
        </Section>

        <Section
          title={
            sectorPrefs.length > 0 ? "Recommended for you" : "Newest roles"
          }
          subtitle={
            sectorPrefs.length > 0
              ? `Picked from your sectors: ${sectorPrefs
                  .map((s) => SECTOR_LABELS[s])
                  .join(", ")}`
              : "Pick sectors on your profile for personalized recs."
          }
          empty={
            recommended.length === 0
              ? {
                  title: "Nothing to surface yet.",
                  body: "Check back as employers post more roles.",
                  cta: { label: "Browse all jobs", href: "/jobs" },
                }
              : null
          }
        >
          <div style={{ display: "grid", gap: 10 }}>
            {recommended.map((j) => (
              <JobMiniCard key={j.id} row={j} />
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}

const listRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "center",
  padding: 14,
  background: "white",
  border: "1px solid var(--v2-ink-200)",
  borderRadius: "var(--v2-r-lg)",
  color: "inherit",
};

function KpiTile({
  label,
  value,
  sub,
  href,
}: {
  label: string;
  value: string;
  sub: string;
  href?: string;
}) {
  const inner = (
    <div
      style={{
        padding: 16,
        background: "white",
        border: "1px solid var(--v2-ink-200)",
        borderRadius: "var(--v2-r-lg)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--v2-font-mono)",
          fontSize: 11,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--v2-ink-600)",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--v2-font-serif)",
          fontSize: 28,
          fontWeight: 900,
          fontStyle: "italic",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 11,
          color: "var(--v2-ink-500)",
          marginTop: 4,
        }}
      >
        {sub}
      </div>
    </div>
  );
  return href ? (
    <Link href={href} style={{ color: "inherit" }}>
      {inner}
    </Link>
  ) : (
    inner
  );
}

function Section({
  title,
  subtitle,
  seeAllHref,
  empty,
  children,
}: {
  title: string;
  subtitle?: string;
  seeAllHref?: string;
  empty?: {
    title: string;
    body: string;
    cta?: { label: string; href: string };
  } | null;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: 32 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 12,
          gap: 12,
        }}
      >
        <div>
          <h3
            className="v2-h3"
            style={{
              fontFamily: "var(--v2-font-serif)",
              fontWeight: 900,
              fontStyle: "italic",
              fontSize: 22,
              letterSpacing: "-0.015em",
            }}
          >
            {title}
          </h3>
          {subtitle && (
            <div
              style={{
                fontSize: 12,
                color: "var(--v2-ink-500)",
                marginTop: 4,
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
        {seeAllHref && (
          <Link
            href={seeAllHref}
            style={{
              fontSize: 12,
              color: "var(--v2-accent-deep)",
              fontWeight: 700,
            }}
          >
            See all →
          </Link>
        )}
      </div>
      {empty ? (
        <div
          style={{
            padding: 28,
            background: "white",
            border: "1px dashed var(--v2-ink-200)",
            borderRadius: "var(--v2-r-lg)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: "var(--v2-font-serif)",
              fontSize: 18,
              fontWeight: 900,
              fontStyle: "italic",
              marginBottom: 6,
            }}
          >
            {empty.title}
          </div>
          <p
            style={{
              fontSize: 13,
              color: "var(--v2-ink-500)",
              marginBottom: 14,
            }}
          >
            {empty.body}
          </p>
          {empty.cta && (
            <Link
              href={empty.cta.href}
              className="v2-btn v2-btn-primary v2-btn-sm"
            >
              {empty.cta.label}
            </Link>
          )}
        </div>
      ) : (
        children
      )}
    </section>
  );
}

function Avatar({
  text,
  imageUrl,
  bg,
  size,
}: {
  text: string;
  imageUrl: string | null;
  bg: string;
  size: number;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        background: bg,
        color: "white",
        display: "grid",
        placeItems: "center",
        fontFamily: "var(--v2-font-serif)",
        fontSize: size * 0.4,
        fontWeight: 900,
        overflow: "hidden",
        position: "relative",
        flexShrink: 0,
      }}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : (
        text
      )}
    </div>
  );
}

type MiniRow = {
  jobId: string;
  jobTitle: string | null;
  jobLocation?: string | null;
  sector: string | null;
  workSetup: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: string | null;
  orgName: string;
  orgLogoColor: string;
  orgLogoUrl: string | null;
};

function JobMiniCard({ row }: { row: MiniRow }) {
  return (
    <Link href={`/jobs/${row.jobId}`} style={listRowStyle}>
      <Avatar
        text={row.orgName.charAt(0).toUpperCase()}
        imageUrl={row.orgLogoUrl}
        bg={row.orgLogoColor}
        size={36}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 14 }}>
            {row.jobTitle ?? "Untitled role"}
          </div>
          {row.sector && (
            <span className="v2-chip v2-chip-accent">
              {SECTOR_LABELS[row.sector as JobSector]}
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: 12,
            color: "var(--v2-ink-500)",
            marginTop: 2,
          }}
        >
          {row.orgName}
          {row.jobLocation && ` · ${row.jobLocation}`}
          {row.workSetup &&
            ` · ${WORK_SETUP_LABELS[row.workSetup as JobWorkSetup]}`}
          {` · ${formatSalary(
            row.salaryMin,
            row.salaryMax,
            row.salaryCurrency,
            row.salaryPeriod,
          )}`}
        </div>
      </div>
      <Icon name="arrowUpRight" size={14} />
    </Link>
  );
}
