import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { and, desc, eq, ne } from "drizzle-orm";
import { db } from "@/server/db";
import {
  applications,
  employerOrgs,
  jobListings,
  orgMembers,
  profiles,
  workHistory,
} from "@/server/db/schema";
import { getSession } from "@/server/auth";
import type { ApplyViewerState } from "./apply-modal";
import { Icon } from "@/components/shared/icon";
import {
  EXPERIENCE_LEVEL_LABELS,
  SECTOR_LABELS,
  WORK_SETUP_LABELS,
  formatSalary,
  type JobExperienceLevel,
  type JobSector,
  type JobWorkSetup,
} from "@/lib/jobs-options";
import { JobDetailClient } from "./job-detail-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const [row] = await db
    .select({
      title: jobListings.title,
      summary: jobListings.summary,
      description: jobListings.description,
      status: jobListings.status,
      orgName: employerOrgs.name,
      coverUrl: employerOrgs.coverUrl,
    })
    .from(jobListings)
    .innerJoin(employerOrgs, eq(employerOrgs.id, jobListings.orgId))
    .where(and(eq(jobListings.id, id), eq(jobListings.status, "published")))
    .limit(1);

  if (!row) return { title: "Role not found — Energized" };

  const title = `${row.title ?? "Untitled role"} — ${row.orgName} | Energized`;
  const description =
    row.summary ??
    (row.description
      ? row.description.slice(0, 160)
      : "Energy sector role on Energized.");

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: row.coverUrl ? [{ url: row.coverUrl }] : undefined,
      type: "website",
    },
    twitter: {
      card: row.coverUrl ? "summary_large_image" : "summary",
      title,
      description,
    },
  };
}

export default async function PublicJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [row] = await db
    .select()
    .from(jobListings)
    .innerJoin(employerOrgs, eq(employerOrgs.id, jobListings.orgId))
    .where(and(eq(jobListings.id, id), eq(jobListings.status, "published")))
    .limit(1);

  if (!row) notFound();

  const job = row.job_listings;
  const org = row.employer_orgs;

  const similar = job.sector
    ? await db
        .select({
          id: jobListings.id,
          title: jobListings.title,
          sector: jobListings.sector,
          location: jobListings.location,
          workSetup: jobListings.workSetup,
          salaryMin: jobListings.salaryMin,
          salaryMax: jobListings.salaryMax,
          salaryCurrency: jobListings.salaryCurrency,
          salaryPeriod: jobListings.salaryPeriod,
          orgName: employerOrgs.name,
          orgLogoUrl: employerOrgs.logoUrl,
          orgLogoColor: employerOrgs.logoColor,
        })
        .from(jobListings)
        .innerJoin(employerOrgs, eq(employerOrgs.id, jobListings.orgId))
        .where(
          and(
            eq(jobListings.status, "published"),
            eq(jobListings.sector, job.sector),
            ne(jobListings.id, job.id),
          ),
        )
        .orderBy(desc(jobListings.publishedAt))
        .limit(3)
    : [];

  const session = await getSession();
  const viewerIsAuthed = Boolean(session);

  let viewer: ApplyViewerState;
  if (!session) {
    viewer = { kind: "anonymous" };
  } else if (session.user.role === "employer") {
    viewer = { kind: "employer" };
  } else {
    const [member] = await db
      .select({ id: orgMembers.id })
      .from(orgMembers)
      .where(eq(orgMembers.userId, session.user.id))
      .limit(1);
    if (member) {
      viewer = { kind: "employer" };
    } else {
      const [applied] = await db
        .select({ id: applications.id })
        .from(applications)
        .where(
          and(
            eq(applications.jobId, job.id),
            eq(applications.candidateId, session.user.id),
          ),
        )
        .limit(1);
      if (applied) {
        viewer = { kind: "applied" };
      } else {
        const [p] = await db
          .select()
          .from(profiles)
          .where(eq(profiles.userId, session.user.id))
          .limit(1);
        if (!p || !p.headline || !p.headline.trim()) {
          viewer = { kind: "incomplete" };
        } else {
          const hasSectors =
            Array.isArray(p.sectors) && p.sectors.length > 0;
          const [wh] = await db
            .select({ id: workHistory.id })
            .from(workHistory)
            .where(eq(workHistory.profileId, p.id))
            .limit(1);
          if (!hasSectors && !wh) {
            viewer = { kind: "incomplete" };
          } else {
            viewer = {
              kind: "eligible",
              candidateName: session.user.name ?? session.user.email,
              candidateHeadline: p.headline,
              candidateLocation: p.location,
              candidateResumeName: p.resumeFilename,
            };
          }
        }
      }
    }
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title ?? undefined,
    description: job.description ?? job.summary ?? undefined,
    datePosted: job.publishedAt?.toISOString(),
    employmentType: job.workSetup ?? undefined,
    hiringOrganization: {
      "@type": "Organization",
      name: org.name,
      sameAs: org.website ?? undefined,
    },
    jobLocation: job.location
      ? {
          "@type": "Place",
          address: {
            "@type": "PostalAddress",
            addressLocality: job.location,
          },
        }
      : undefined,
    baseSalary:
      job.salaryMin != null || job.salaryMax != null
        ? {
            "@type": "MonetaryAmount",
            currency: job.salaryCurrency ?? "CAD",
            value: {
              "@type": "QuantitativeValue",
              minValue: job.salaryMin ?? undefined,
              maxValue: job.salaryMax ?? undefined,
              unitText:
                job.salaryPeriod === "hour"
                  ? "HOUR"
                  : job.salaryPeriod === "day"
                    ? "DAY"
                    : "YEAR",
            },
          }
        : undefined,
  };

  return (
    <div
      className="v2"
      style={{ minHeight: "100vh", background: "var(--v2-ink-50)" }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

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
          {viewerIsAuthed ? (
            <Link href="/dashboard" className="v2-btn v2-btn-primary v2-btn-sm">
              Dashboard →
            </Link>
          ) : (
            <>
              <Link href="/sign-in" style={{ color: "var(--v2-ink-700)" }}>
                Sign in
              </Link>
              <Link href="/sign-up" className="v2-btn v2-btn-primary v2-btn-sm">
                Sign up
              </Link>
            </>
          )}
        </nav>
      </header>

      <div
        className="v2-container"
        style={{ paddingTop: 28, paddingBottom: 72 }}
      >
        <Link
          href="/jobs"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            color: "var(--v2-ink-500)",
            marginBottom: 20,
            fontFamily: "var(--v2-font-mono)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          <Icon
            name="arrowUpRight"
            size={12}
            style={{ transform: "rotate(180deg)" }}
          />{" "}
          Back to jobs
        </Link>

        <JobDetailClient
          job={{
            id: job.id,
            title: job.title,
            summary: job.summary,
            description: job.description,
            sector: job.sector as JobSector | null,
            subSectors: job.subSectors,
            experienceLevel: job.experienceLevel as JobExperienceLevel | null,
            location: job.location,
            workSetup: job.workSetup as JobWorkSetup | null,
            rotationSchedule: job.rotationSchedule,
            hoursPerWeek: job.hoursPerWeek,
            salaryMin: job.salaryMin,
            salaryMax: job.salaryMax,
            salaryCurrency: job.salaryCurrency,
            salaryPeriod: job.salaryPeriod,
            requiredCertifications: job.requiredCertifications,
            screeningQuestions: job.screeningQuestions,
            publishedAt: job.publishedAt,
          }}
          org={{
            id: org.id,
            name: org.name,
            tagline: org.tagline,
            about: org.about,
            website: org.website,
            hq: org.hq,
            founded: org.founded,
            size: org.size,
            primarySector: org.primarySector as JobSector | null,
            subSectors: org.subSectors,
            logoUrl: org.logoUrl,
            logoColor: org.logoColor,
            verified: org.verified,
          }}
          similar={similar.map((s) => ({
            id: s.id,
            title: s.title,
            sector: s.sector as JobSector | null,
            location: s.location,
            workSetup: s.workSetup as JobWorkSetup | null,
            salaryMin: s.salaryMin,
            salaryMax: s.salaryMax,
            salaryCurrency: s.salaryCurrency,
            salaryPeriod: s.salaryPeriod,
            orgName: s.orgName,
            orgLogoUrl: s.orgLogoUrl,
            orgLogoColor: s.orgLogoColor,
          }))}
          labels={{
            sector: SECTOR_LABELS,
            workSetup: WORK_SETUP_LABELS,
            experienceLevel: EXPERIENCE_LEVEL_LABELS,
          }}
          salaryFormatter={formatSalary}
          viewer={viewer}
          signInHref={`/sign-in?redirect=/jobs/${job.id}`}
        />
      </div>
    </div>
  );
}
