import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import {
  applications,
  employerOrgs,
  jobListings,
} from "@/server/db/schema";
import { getSession } from "@/server/auth";
import { SiteHeader } from "@/components/marketing/site-header";
import { Icon } from "@/components/shared/icon";
import { STAGE_FROM_DB, STAGE_LABEL } from "@/lib/application-stages";

export const metadata: Metadata = {
  title: "My applications — Energized",
};

export default async function MyApplicationsPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in?redirect=/applications");

  const rows = await db
    .select({
      id: applications.id,
      status: applications.status,
      createdAt: applications.createdAt,
      jobId: applications.jobId,
      jobTitle: jobListings.title,
      jobLocation: jobListings.location,
      orgId: employerOrgs.id,
      orgName: employerOrgs.name,
      orgLogoUrl: employerOrgs.logoUrl,
      orgLogoColor: employerOrgs.logoColor,
    })
    .from(applications)
    .innerJoin(jobListings, eq(jobListings.id, applications.jobId))
    .innerJoin(employerOrgs, eq(employerOrgs.id, jobListings.orgId))
    .where(eq(applications.candidateId, session.user.id))
    .orderBy(desc(applications.createdAt));

  return (
    <div
      className="v2"
      style={{ minHeight: "100vh", background: "var(--v2-ink-50)" }}
    >
      <SiteHeader active="applications" />

      <div
        className="v2-container"
        style={{ paddingTop: 48, paddingBottom: 80, maxWidth: 820 }}
      >
        <div className="v2-eyebrow">
          {rows.length} {rows.length === 1 ? "application" : "applications"}
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
          Your applications.
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
              You haven&apos;t applied yet.
            </div>
            <p style={{ color: "var(--v2-ink-500)", marginBottom: 20 }}>
              Browse open roles — there are real jobs waiting.
            </p>
            <Link href="/jobs" className="v2-btn v2-btn-primary v2-btn-sm">
              Browse jobs
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {rows.map((r) => (
              <Link
                key={r.id}
                href={`/jobs/${r.jobId}`}
                style={{
                  display: "flex",
                  gap: 14,
                  alignItems: "center",
                  padding: 18,
                  background: "white",
                  border: "1px solid var(--v2-ink-200)",
                  borderRadius: "var(--v2-r-xl)",
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
                  <div style={{ fontWeight: 700, fontSize: 16 }}>
                    {r.jobTitle ?? "Untitled role"}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--v2-ink-500)",
                      marginTop: 2,
                    }}
                  >
                    {r.orgName}
                    {r.jobLocation && ` · ${r.jobLocation}`}
                    {` · Applied ${new Date(r.createdAt).toLocaleDateString(
                      "en-CA",
                      { month: "short", day: "numeric" },
                    )}`}
                  </div>
                </div>
                <span
                  className={
                    STAGE_FROM_DB[r.status] === "rejected"
                      ? "v2-chip v2-chip-coral"
                      : "v2-chip v2-chip-accent"
                  }
                >
                  {STAGE_LABEL[STAGE_FROM_DB[r.status]]}
                </span>
                <Icon name="arrowUpRight" size={14} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
