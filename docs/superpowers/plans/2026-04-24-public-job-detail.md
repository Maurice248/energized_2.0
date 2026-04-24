# Public Job Detail Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a public, read-only job detail page at `/jobs/[id]` that a jobseeker (or anyone with a link) can view — replacing the need to share the employer-only preview URL.

**Architecture:** Server component at `src/app/jobs/[id]/page.tsx` follows the same pattern as the existing `/c/[id]` public company page — direct Drizzle queries against `jobListings` + `employerOrgs`, plus a second query for "similar roles." Tab state lives in a small client component. SEO via `generateMetadata` plus a JSON-LD `JobPosting` block for search engines. Signed-in vs anonymous only changes the top-right nav.

**Tech Stack:** Next.js App Router (RSC), Drizzle, Better Auth session, Lato + existing `v2-*` CSS classes, JSON-LD structured data.

**Reference mock:** `~/Desktop/Energized/v2-detail.jsx`
**Design: §1, §2 of the brainstorm above (this conversation).**

---

## File Structure

**New files**
- `src/app/jobs/[id]/page.tsx` — server component: session, fetch job + org + similar jobs, 404, render header + client
- `src/app/jobs/[id]/job-detail-client.tsx` — client: tabs + body rendering
- `src/app/jobs/[id]/not-found.tsx` — branded 404

No changes to tRPC router, DB schema, or any existing page. The existing `/c/[id]` public company page is the stylistic template.

---

## Task 1: Server component + metadata + JSON-LD

**Files:**
- Create: `src/app/jobs/[id]/page.tsx`

This server component handles data fetching, SEO metadata, session-aware header rendering, and delegates the interactive tab state to the client component in Task 2.

- [ ] **Step 1: Write the full page file**

Create `src/app/jobs/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { and, desc, eq, ne } from "drizzle-orm";
import { db } from "@/server/db";
import { employerOrgs, jobListings } from "@/server/db/schema";
import { getSession } from "@/server/auth";
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
    .where(
      and(eq(jobListings.id, id), eq(jobListings.status, "published")),
    )
    .limit(1);

  if (!row) return { title: "Role not found — Energized" };

  const title = `${row.title ?? "Untitled role"} — ${row.orgName} | Energized`;
  const description =
    row.summary ??
    (row.description ? row.description.slice(0, 160) : "Energy sector role on Energized.");

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
    .where(
      and(eq(jobListings.id, id), eq(jobListings.status, "published")),
    )
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
          address: { "@type": "PostalAddress", addressLocality: job.location },
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
            <Link
              href="/dashboard"
              className="v2-btn v2-btn-primary v2-btn-sm"
            >
              Dashboard →
            </Link>
          ) : (
            <>
              <Link href="/sign-in" style={{ color: "var(--v2-ink-700)" }}>
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="v2-btn v2-btn-primary v2-btn-sm"
              >
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
          <Icon name="arrowUpRight" size={12} style={{ transform: "rotate(180deg)" }} />{" "}
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
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: fails with `Cannot find module './job-detail-client'` — that file is Task 2. Don't commit yet; move to Task 2.

---

## Task 2: Client component

**Files:**
- Create: `src/app/jobs/[id]/job-detail-client.tsx`

Tab state + body rendering. Kept pure presentational — the server component owns the data.

- [ ] **Step 1: Write the file**

Create `src/app/jobs/[id]/job-detail-client.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/shared/icon";
import type {
  JobExperienceLevel,
  JobSector,
  JobWorkSetup,
} from "@/lib/jobs-options";

type ScreeningQuestion = { q: string; required: boolean };

type Job = {
  id: string;
  title: string | null;
  summary: string | null;
  description: string | null;
  sector: JobSector | null;
  subSectors: string[];
  experienceLevel: JobExperienceLevel | null;
  location: string | null;
  workSetup: JobWorkSetup | null;
  rotationSchedule: string | null;
  hoursPerWeek: number | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: string | null;
  requiredCertifications: string[];
  screeningQuestions: ScreeningQuestion[];
  publishedAt: Date | null;
};

type Org = {
  id: string;
  name: string;
  tagline: string | null;
  about: string | null;
  website: string | null;
  hq: string | null;
  founded: string | null;
  size: string | null;
  primarySector: JobSector | null;
  subSectors: string[];
  logoUrl: string | null;
  logoColor: string;
  verified: boolean;
};

type Similar = {
  id: string;
  title: string | null;
  sector: JobSector | null;
  location: string | null;
  workSetup: JobWorkSetup | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: string | null;
  orgName: string;
  orgLogoUrl: string | null;
  orgLogoColor: string;
};

type Props = {
  job: Job;
  org: Org;
  similar: Similar[];
  labels: {
    sector: Record<JobSector, string>;
    workSetup: Record<JobWorkSetup, string>;
    experienceLevel: Record<JobExperienceLevel, string>;
  };
  salaryFormatter: (
    min: number | null,
    max: number | null,
    currency: string | null,
    period: string | null,
  ) => string;
};

const COMPANY_SIZE_LABELS: Record<string, string> = {
  "1_10": "1–10",
  "11_50": "11–50",
  "51_120": "51–120",
  "120_250": "120–250",
  "250_500": "250–500",
  "500_1000": "500–1000",
  "1000_plus": "1000+",
};

export function JobDetailClient({
  job,
  org,
  similar,
  labels,
  salaryFormatter,
}: Props) {
  const [tab, setTab] = useState<"overview" | "company">("overview");

  const postedLabel = job.publishedAt
    ? new Date(job.publishedAt).toLocaleDateString("en-CA", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) 340px",
        gap: 32,
        alignItems: "start",
      }}
    >
      <div style={{ minWidth: 0 }}>
        {/* Hero */}
        <div
          style={{
            background: "white",
            border: "1px solid var(--v2-ink-200)",
            borderRadius: "var(--v2-r-xl)",
            padding: 32,
          }}
        >
          <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 16,
                background: org.logoColor,
                color: "white",
                display: "grid",
                placeItems: "center",
                fontFamily: "var(--v2-font-serif)",
                fontSize: 22,
                fontWeight: 900,
                overflow: "hidden",
                position: "relative",
              }}
            >
              {org.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={org.logoUrl}
                  alt={org.name}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                org.name.charAt(0).toUpperCase()
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--v2-ink-500)",
                  fontFamily: "var(--v2-font-mono)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                <Link href={`/c/${org.id}`} style={{ color: "inherit" }}>
                  {org.name}
                </Link>
                {org.primarySector && ` · ${labels.sector[org.primarySector]}`}
              </div>
              {job.sector && (
                <span
                  className="v2-chip v2-chip-accent"
                  style={{ marginTop: 6 }}
                >
                  {labels.sector[job.sector]}
                </span>
              )}
            </div>
          </div>

          <h1
            className="v2-h2"
            style={{
              fontStyle: "italic",
              fontWeight: 900,
              marginTop: 18,
              marginBottom: 16,
            }}
          >
            {job.title ?? "Untitled role"}
          </h1>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 18,
              fontSize: 14,
              color: "var(--v2-ink-600)",
              marginBottom: 18,
            }}
          >
            {job.location && (
              <span
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Icon name="mapPin" size={14} /> {job.location}
              </span>
            )}
            {job.workSetup && (
              <span
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Icon name="briefcase" size={14} />{" "}
                {labels.workSetup[job.workSetup]}
                {job.rotationSchedule && ` · Rotation ${job.rotationSchedule}`}
              </span>
            )}
            <span
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Icon name="dollar" size={14} />{" "}
              {salaryFormatter(
                job.salaryMin,
                job.salaryMax,
                job.salaryCurrency,
                job.salaryPeriod,
              )}
            </span>
            {postedLabel && (
              <span
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Icon name="check" size={14} /> Posted {postedLabel}
              </span>
            )}
            {job.experienceLevel && (
              <span
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Icon name="sparkles" size={14} />{" "}
                {labels.experienceLevel[job.experienceLevel]}
              </span>
            )}
          </div>

          {job.requiredCertifications.length > 0 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 24,
              }}
            >
              {job.requiredCertifications.map((c) => (
                <span key={c} className="v2-chip v2-chip-outline">
                  {c}
                </span>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              className="v2-btn v2-btn-primary"
              disabled
              title="Apply flow coming soon"
            >
              Apply now <Icon name="arrowUpRight" size={14} />
            </button>
            <button className="v2-btn v2-btn-ghost" disabled title="Saved roles coming soon">
              <Icon name="bookmark" size={14} /> Save
            </button>
          </div>
          <div
            style={{
              marginTop: 10,
              fontSize: 12,
              color: "var(--v2-ink-500)",
              fontStyle: "italic",
            }}
          >
            Apply flow coming soon — share this link with the hiring team in
            the meantime.
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: 4,
            marginTop: 24,
            padding: 4,
            background: "white",
            border: "1px solid var(--v2-ink-200)",
            borderRadius: 999,
            width: "fit-content",
          }}
        >
          {(["overview", "company"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: "8px 18px",
                borderRadius: 999,
                fontSize: 14,
                fontWeight: 700,
                background:
                  tab === t ? "var(--v2-ink-950)" : "transparent",
                color: tab === t ? "white" : "var(--v2-ink-700)",
                transition: "background .15s ease",
              }}
            >
              {t === "overview" ? "Overview" : "About the company"}
            </button>
          ))}
        </div>

        {/* Tab bodies */}
        {tab === "overview" && (
          <div
            style={{
              marginTop: 20,
              background: "white",
              border: "1px solid var(--v2-ink-200)",
              borderRadius: "var(--v2-r-xl)",
              padding: 32,
            }}
          >
            {job.summary && (
              <p
                style={{
                  fontSize: 17,
                  lineHeight: 1.55,
                  color: "var(--v2-ink-700)",
                  marginBottom: 24,
                }}
              >
                {job.summary}
              </p>
            )}

            <h3
              className="v2-h3"
              style={{ marginBottom: 12, letterSpacing: "-0.015em" }}
            >
              About the role
            </h3>
            <div
              style={{
                whiteSpace: "pre-wrap",
                lineHeight: 1.65,
                color: "var(--v2-ink-700)",
              }}
            >
              {job.description ?? "The hiring team hasn't shared a full description yet."}
            </div>

            {job.subSectors.length > 0 && (
              <div style={{ marginTop: 32 }}>
                <div
                  style={{
                    fontFamily: "var(--v2-font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--v2-ink-500)",
                    marginBottom: 10,
                  }}
                >
                  Sub-sectors
                </div>
                <div
                  style={{ display: "flex", flexWrap: "wrap", gap: 8 }}
                >
                  {job.subSectors.map((s) => (
                    <span key={s} className="v2-chip">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {job.screeningQuestions.length > 0 && (
              <div style={{ marginTop: 32 }}>
                <h3
                  className="v2-h3"
                  style={{ marginBottom: 12, letterSpacing: "-0.015em" }}
                >
                  Questions you&apos;ll answer
                </h3>
                <ol
                  style={{
                    paddingLeft: 20,
                    display: "grid",
                    gap: 10,
                    color: "var(--v2-ink-700)",
                  }}
                >
                  {job.screeningQuestions.map((q, i) => (
                    <li key={i}>
                      {q.q}
                      {q.required && (
                        <span
                          style={{
                            marginLeft: 8,
                            fontSize: 11,
                            color: "#A63A20",
                            fontFamily: "var(--v2-font-mono)",
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                          }}
                        >
                          Required
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}

        {tab === "company" && (
          <div
            style={{
              marginTop: 20,
              background: "white",
              border: "1px solid var(--v2-ink-200)",
              borderRadius: "var(--v2-r-xl)",
              padding: 32,
            }}
          >
            <h3
              className="v2-h3"
              style={{ marginBottom: 12, letterSpacing: "-0.015em" }}
            >
              About {org.name}
            </h3>
            {org.tagline && (
              <p
                style={{
                  fontStyle: "italic",
                  color: "var(--v2-ink-600)",
                  fontFamily: "var(--v2-font-serif)",
                  fontSize: 18,
                  marginBottom: 14,
                }}
              >
                {org.tagline}
              </p>
            )}
            <div
              style={{
                whiteSpace: "pre-wrap",
                lineHeight: 1.65,
                color: "var(--v2-ink-700)",
              }}
            >
              {org.about ?? "This company hasn't written an about yet."}
            </div>

            <div
              style={{
                marginTop: 28,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 16,
              }}
            >
              {org.founded && <StatTile label="Founded" value={org.founded} />}
              {org.hq && <StatTile label="HQ" value={org.hq} />}
              {org.size && (
                <StatTile
                  label="Team size"
                  value={COMPANY_SIZE_LABELS[org.size] ?? org.size}
                />
              )}
              {org.primarySector && (
                <StatTile
                  label="Sector"
                  value={labels.sector[org.primarySector]}
                />
              )}
            </div>

            {org.subSectors.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <div
                  style={{
                    fontFamily: "var(--v2-font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--v2-ink-500)",
                    marginBottom: 10,
                  }}
                >
                  Focus areas
                </div>
                <div
                  style={{ display: "flex", flexWrap: "wrap", gap: 8 }}
                >
                  {org.subSectors.map((s) => (
                    <span key={s} className="v2-chip">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginTop: 28, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link
                href={`/c/${org.id}`}
                className="v2-btn v2-btn-ghost v2-btn-sm"
              >
                View company page <Icon name="arrowUpRight" size={14} />
              </Link>
              {org.website && (
                <a
                  href={org.website}
                  target="_blank"
                  rel="noreferrer"
                  className="v2-btn v2-btn-ghost v2-btn-sm"
                >
                  <Icon name="globe" size={14} /> Website
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Aside */}
      <aside style={{ display: "grid", gap: 16 }}>
        <div
          style={{
            background: "white",
            border: "1px solid var(--v2-ink-200)",
            borderRadius: "var(--v2-r-xl)",
            padding: 22,
          }}
        >
          <div
            style={{
              fontFamily: "var(--v2-font-mono)",
              fontSize: 11,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--v2-ink-500)",
              marginBottom: 14,
            }}
          >
            Posted by
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: org.logoColor,
                color: "white",
                display: "grid",
                placeItems: "center",
                fontFamily: "var(--v2-font-serif)",
                fontSize: 18,
                fontWeight: 900,
                overflow: "hidden",
                position: "relative",
              }}
            >
              {org.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={org.logoUrl}
                  alt={org.name}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                org.name.charAt(0).toUpperCase()
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700 }}>{org.name}</div>
              {org.hq && (
                <div style={{ fontSize: 12, color: "var(--v2-ink-500)" }}>
                  {org.hq}
                </div>
              )}
            </div>
          </div>
          {org.verified && (
            <div
              style={{
                marginTop: 12,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px",
                background: "var(--v2-accent-soft)",
                borderRadius: 999,
                fontSize: 11,
                fontFamily: "var(--v2-font-mono)",
                color: "var(--v2-ink-900)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                fontWeight: 700,
              }}
            >
              <Icon name="shield" size={11} /> Verified
            </div>
          )}
        </div>

        {similar.length > 0 && (
          <div
            style={{
              background: "white",
              border: "1px solid var(--v2-ink-200)",
              borderRadius: "var(--v2-r-xl)",
              padding: 22,
            }}
          >
            <h3
              style={{
                fontFamily: "var(--v2-font-serif)",
                fontSize: 20,
                fontWeight: 400,
                letterSpacing: "-0.015em",
                marginBottom: 14,
              }}
            >
              Similar roles
            </h3>
            <div style={{ display: "grid", gap: 10 }}>
              {similar.map((s) => (
                <Link
                  key={s.id}
                  href={`/jobs/${s.id}`}
                  style={{
                    padding: 12,
                    border: "1px solid var(--v2-ink-200)",
                    borderRadius: 12,
                    display: "block",
                    color: "inherit",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: s.orgLogoColor,
                        color: "white",
                        fontSize: 11,
                        fontWeight: 700,
                        display: "grid",
                        placeItems: "center",
                        overflow: "hidden",
                        position: "relative",
                        flexShrink: 0,
                      }}
                    >
                      {s.orgLogoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={s.orgLogoUrl}
                          alt={s.orgName}
                          style={{
                            position: "absolute",
                            inset: 0,
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        s.orgName.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {s.title ?? "Untitled role"}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--v2-ink-500)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {s.orgName}
                        {s.location && ` · ${s.location}`}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: 14,
        background: "var(--v2-ink-50)",
        borderRadius: 12,
      }}
    >
      <div
        style={{
          fontFamily: "var(--v2-font-mono)",
          fontSize: 11,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--v2-ink-500)",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--v2-font-serif)",
          fontSize: 20,
          fontWeight: 900,
          marginTop: 4,
        }}
      >
        {value}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: passes (ignore the pre-existing `code/trigger/example.ts` lint error).

- [ ] **Step 3: Commit both files together**

```bash
git add "src/app/jobs/[id]/page.tsx" "src/app/jobs/[id]/job-detail-client.tsx"
git commit -m "$(cat <<'EOF'
feat(jobs): public /jobs/[id] read-only detail page

Server component pulls job + employer + similar roles directly from
Drizzle, wraps a small client for tab state. Apply / Save are shown
disabled with helper copy — they'll land in a later spec. Adds
JobPosting JSON-LD and OpenGraph metadata for shareable links.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Branded 404

**Files:**
- Create: `src/app/jobs/[id]/not-found.tsx`

- [ ] **Step 1: Write the file**

Create `src/app/jobs/[id]/not-found.tsx`:

```tsx
import Link from "next/link";

export const metadata = { title: "Role not found — Energized" };

export default function JobNotFound() {
  return (
    <div
      className="v2"
      style={{
        minHeight: "80vh",
        display: "grid",
        placeItems: "center",
        padding: 40,
        background: "var(--v2-ink-50)",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 480 }}>
        <div
          className="v2-eyebrow"
          style={{ justifyContent: "center", marginBottom: 14 }}
        >
          404 · Role not found
        </div>
        <h1
          className="v2-h2"
          style={{ fontStyle: "italic", marginBottom: 14 }}
        >
          This role has moved on.
        </h1>
        <p style={{ color: "var(--v2-ink-600)", marginBottom: 24 }}>
          It may have been unpublished, closed, or the link might be off. Have
          a look at what&apos;s open.
        </p>
        <Link href="/jobs" className="v2-btn v2-btn-primary">
          Browse open roles
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add "src/app/jobs/[id]/not-found.tsx"
git commit -m "$(cat <<'EOF'
feat(jobs): branded 404 for /jobs/[id]

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Manual verification

**Files:** none

- [ ] **Step 1: Visit a published job anonymously**

Open an incognito window at `http://localhost:3000/jobs/<published-job-id>`.
Expected: full detail page renders. Top-right shows **Sign in** and **Sign up** buttons. No errors in the dev-server log.

- [ ] **Step 2: Visit while signed in**

Same URL in a signed-in window.
Expected: top-right shows **Dashboard →** instead of sign-in. Same body content.

- [ ] **Step 3: Switch tabs**

Click **About the company**.
Expected: overview hides, company content shows — name, tagline, about, stat tiles (Founded / HQ / Team size / Sector) populated from the org row. Switch back to Overview — body returns.

- [ ] **Step 4: 404 check**

Open `http://localhost:3000/jobs/00000000-0000-0000-0000-000000000000` (bogus UUID).
Expected: the branded 404 renders with **Browse open roles** button.

- [ ] **Step 5: Draft / closed doesn't leak**

Open a `/jobs/<draft-job-id>` URL (a draft you made in the wizard).
Expected: 404 — never the draft.

- [ ] **Step 6: SEO sanity**

View source on a published job page; confirm `<script type="application/ld+json">` is present and the `JobPosting` @type parses as JSON. Confirm `<title>` contains the role title and company name.

- [ ] **Step 7: Final checks**

Run: `pnpm typecheck && pnpm lint`
Expected: passes.

No commits — verification only.

---

## Out of scope (deferred)

- Apply flow (its own spec — will add `applications` table, tRPC, Trigger.dev email)
- Save / bookmark for signed-in jobseekers
- Ember match scoring and "Tailor my resume"
- `/jobs` index page (the Back-to-jobs link points here — this page is still a separate spec)
