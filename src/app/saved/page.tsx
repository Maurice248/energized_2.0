import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { employerOrgs, jobListings, savedJobs } from "@/server/db/schema";
import { getSession } from "@/server/auth";
import { Icon } from "@/components/shared/icon";
import { SiteHeader } from "@/components/marketing/site-header";
import {
  SECTOR_LABELS,
  WORK_SETUP_LABELS,
  formatSalary,
  type JobSector,
  type JobWorkSetup,
} from "@/lib/jobs-options";
import { UnsaveButton } from "./_components/unsave-button";

export const metadata: Metadata = {
  title: "Saved roles — Energized",
};

export default async function SavedJobsPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in?redirect=/saved");

  const rows = await db
    .select({
      id: savedJobs.id,
      createdAt: savedJobs.createdAt,
      jobId: jobListings.id,
      jobTitle: jobListings.title,
      jobLocation: jobListings.location,
      jobStatus: jobListings.status,
      workSetup: jobListings.workSetup,
      sector: jobListings.sector,
      salaryMin: jobListings.salaryMin,
      salaryMax: jobListings.salaryMax,
      salaryCurrency: jobListings.salaryCurrency,
      salaryPeriod: jobListings.salaryPeriod,
      orgId: employerOrgs.id,
      orgName: employerOrgs.name,
      orgLogoUrl: employerOrgs.logoUrl,
      orgLogoColor: employerOrgs.logoColor,
    })
    .from(savedJobs)
    .innerJoin(jobListings, eq(jobListings.id, savedJobs.jobId))
    .innerJoin(employerOrgs, eq(employerOrgs.id, jobListings.orgId))
    .where(eq(savedJobs.userId, session.user.id))
    .orderBy(desc(savedJobs.createdAt));

  return (
    <div
      className="v2"
      style={{ minHeight: "100vh", background: "var(--v2-ink-50)" }}
    >
      <SiteHeader active="saved" />

      <div
        className="v2-container"
        style={{ paddingTop: 48, paddingBottom: 80, maxWidth: 820 }}
      >
        <div className="v2-eyebrow">
          {rows.length} {rows.length === 1 ? "saved role" : "saved roles"}
        </div>
        <h1
          className="v2-h2"
          style={{
            fontStyle: "italic",
            fontWeight: 900,
            marginTop: 14,
            marginBottom: 24,
          }}
        >
          Your saved roles.
        </h1>

        {rows.length === 0 ? (
          <div
            style={{
              padding: 48,
              background: "white",
              border: "1px solid var(--v2-ink-200)",
              borderRadius: "var(--v2-r-xl)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontFamily: "var(--v2-font-serif)",
                fontSize: 24,
                fontWeight: 900,
                fontStyle: "italic",
                marginBottom: 10,
              }}
            >
              No saved roles yet.
            </div>
            <p style={{ color: "var(--v2-ink-500)", marginBottom: 20 }}>
              Bookmark a role from any job page — it lands here.
            </p>
            <Link href="/jobs" className="v2-btn v2-btn-primary v2-btn-sm">
              Browse jobs
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {rows.map((r) => (
              <div
                key={r.id}
                style={{
                  display: "flex",
                  gap: 14,
                  alignItems: "flex-start",
                  padding: 18,
                  background: "white",
                  border: "1px solid var(--v2-ink-200)",
                  borderRadius: "var(--v2-r-xl)",
                }}
              >
                <Link
                  href={`/jobs/${r.jobId}`}
                  style={{
                    display: "flex",
                    gap: 14,
                    alignItems: "flex-start",
                    flex: 1,
                    minWidth: 0,
                    color: "inherit",
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: r.orgLogoColor,
                      color: "white",
                      display: "grid",
                      placeItems: "center",
                      fontFamily: "var(--v2-font-serif)",
                      fontSize: 18,
                      fontWeight: 900,
                      overflow: "hidden",
                      position: "relative",
                      flexShrink: 0,
                    }}
                  >
                    {r.orgLogoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.orgLogoUrl}
                        alt={r.orgName}
                        style={{
                          position: "absolute",
                          inset: 0,
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      r.orgName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        alignItems: "center",
                        flexWrap: "wrap",
                        marginBottom: 4,
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 16 }}>
                        {r.jobTitle ?? "Untitled role"}
                      </div>
                      {r.sector && (
                        <span className="v2-chip v2-chip-accent">
                          {SECTOR_LABELS[r.sector as JobSector]}
                        </span>
                      )}
                      {r.jobStatus !== "published" && (
                        <span className="v2-chip v2-chip-coral">
                          {r.jobStatus === "closed" ? "Closed" : "Not public"}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "var(--v2-ink-500)",
                        marginBottom: 8,
                      }}
                    >
                      {r.orgName}
                      {r.jobLocation && ` · ${r.jobLocation}`}
                      {r.workSetup &&
                        ` · ${WORK_SETUP_LABELS[r.workSetup as JobWorkSetup]}`}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--v2-font-mono)",
                        fontSize: 12,
                        color: "var(--v2-ink-600)",
                      }}
                    >
                      {formatSalary(
                        r.salaryMin,
                        r.salaryMax,
                        r.salaryCurrency,
                        r.salaryPeriod,
                      )}
                    </div>
                  </div>
                </Link>
                <UnsaveButton jobId={r.jobId} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
