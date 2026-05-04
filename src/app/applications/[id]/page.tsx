import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { applications, employerOrgs, jobListings } from "@/server/db/schema";
import { getSession } from "@/server/auth";
import { SiteHeader } from "@/components/marketing/site-header";
import { STAGE_FROM_DB, STAGE_LABEL } from "@/lib/application-stages";
import { InterviewBlock } from "@/components/shared/interview-block";

export const metadata: Metadata = {
  title: "Application — Energized",
};

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect(`/sign-in?redirect=/applications/${id}`);

  const [app] = await db
    .select({
      id: applications.id,
      candidateId: applications.candidateId,
      statusDb: applications.status,
      coverNote: applications.coverNote,
      createdAt: applications.createdAt,
      jobId: jobListings.id,
      jobTitle: jobListings.title,
      orgName: employerOrgs.name,
    })
    .from(applications)
    .innerJoin(jobListings, eq(jobListings.id, applications.jobId))
    .innerJoin(employerOrgs, eq(employerOrgs.id, jobListings.orgId))
    .where(eq(applications.id, id))
    .limit(1);

  if (!app) notFound();
  if (app.candidateId !== session.user.id) notFound();

  const stageKey = STAGE_FROM_DB[app.statusDb] ?? "applied";
  const stageLabel = STAGE_LABEL[stageKey];

  return (
    <div className="v2" style={{ minHeight: "100vh", background: "var(--v2-ink-50)" }}>
      <SiteHeader active="applications" />
      <main className="v2-container" style={{ paddingTop: 48, paddingBottom: 80, maxWidth: 760 }}>
        <header style={{ marginBottom: 28 }}>
          <Link
            href="/applications"
            style={{ fontSize: 13, color: "var(--v2-ink-500)", textDecoration: "none" }}
          >
            ← My applications
          </Link>
          <h1
            className="v2-h2"
            style={{
              fontStyle: "italic",
              fontWeight: 900,
              marginTop: 10,
              marginBottom: 4,
            }}
          >
            {app.jobTitle ?? "Application"}
          </h1>
          <div style={{ fontSize: 14, color: "var(--v2-ink-600)", marginTop: 4 }}>
            {app.orgName} ·{" "}
            <Link href={`/jobs/${app.jobId}`} style={{ color: "var(--v2-accent-deep)" }}>
              View role
            </Link>
          </div>
          <div style={{ marginTop: 12 }}>
            <span
              className={
                stageKey === "rejected" ? "v2-chip v2-chip-coral" : "v2-chip v2-chip-accent"
              }
            >
              {stageLabel}
            </span>
          </div>
        </header>

        {app.coverNote && (
          <section
            style={{
              padding: 16,
              background: "white",
              border: "1px solid var(--v2-ink-200)",
              borderRadius: "var(--v2-r-xl)",
              marginBottom: 20,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--v2-ink-700)",
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Your cover note
            </div>
            <div
              style={{ fontSize: 14, color: "var(--v2-ink-900)", whiteSpace: "pre-wrap", lineHeight: 1.6 }}
            >
              {app.coverNote}
            </div>
          </section>
        )}

        <InterviewBlock applicationId={id} viewer="candidate" />
      </main>
    </div>
  );
}
