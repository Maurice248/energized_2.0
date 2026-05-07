import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import {
  applications,
  employerOrgs,
  jobListings,
  orgMembers,
  profiles,
  user,
} from "@/server/db/schema";
import { getSession } from "@/server/auth";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/marketing/site-header";
import { STAGE_FROM_DB, STAGE_LABEL } from "@/lib/application-stages";
import { InterviewBlock } from "@/components/shared/interview-block";
import { ScheduleInterviewModal } from "@/components/shared/schedule-interview-modal";

export const metadata: Metadata = {
  title: "Applicant — Energized",
};

export default async function EmployerApplicantDetailPage({
  params,
}: {
  params: Promise<{ id: string; applicationId: string }>;
}) {
  const { id: jobId, applicationId } = await params;
  const session = await getSession();
  if (!session)
    redirect(
      `/sign-in?redirect=/employer/jobs/${jobId}/applicants/${applicationId}`,
    );

  const [row] = await db
    .select({
      applicationId: applications.id,
      candidateId: applications.candidateId,
      candidateName: user.name,
      candidateImage: user.image,
      coverNote: applications.coverNote,
      screeningAnswers: applications.screeningAnswers,
      statusDb: applications.status,
      jobId: jobListings.id,
      jobTitle: jobListings.title,
      orgId: employerOrgs.id,
      orgName: employerOrgs.name,
      headline: profiles.headline,
    })
    .from(applications)
    .innerJoin(user, eq(user.id, applications.candidateId))
    .innerJoin(jobListings, eq(jobListings.id, applications.jobId))
    .innerJoin(employerOrgs, eq(employerOrgs.id, jobListings.orgId))
    .leftJoin(profiles, eq(profiles.userId, user.id))
    .where(
      and(eq(applications.id, applicationId), eq(jobListings.id, jobId)),
    )
    .limit(1);

  if (!row) notFound();

  // Caller must be an active member of the org owning the job.
  const [member] = await db
    .select({ role: orgMembers.role })
    .from(orgMembers)
    .where(
      and(
        eq(orgMembers.orgId, row.orgId),
        eq(orgMembers.userId, session.user.id),
      ),
    )
    .limit(1);
  if (!member) notFound();

  const stageKey = STAGE_FROM_DB[row.statusDb] ?? "applied";
  const stageLabel = STAGE_LABEL[stageKey];

  return (
    <>
      <SiteHeader active="dashboard" />
      <main
        className="v2"
        style={{ minHeight: "100vh", background: "var(--v2-ink-50)" }}
      >
        <div
          className="v2-container"
          style={{ paddingTop: 32, paddingBottom: 64, maxWidth: 720 }}
        >
          {/* Back link */}
          <Link
            href={`/employer/jobs/${jobId}/applicants`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              color: "var(--v2-ink-500)",
              marginBottom: 24,
              fontFamily: "var(--v2-font-mono)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              textDecoration: "none",
            }}
          >
            ← Back to applicants
          </Link>

          {/* Applicant header */}
          <header
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginBottom: 24,
              padding: 20,
              background: "white",
              border: "1px solid var(--v2-ink-200)",
              borderRadius: "var(--v2-r-xl)",
            }}
          >
            {row.candidateImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={row.candidateImage}
                alt=""
                width={52}
                height={52}
                style={{ borderRadius: 999, flexShrink: 0, objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 999,
                  background: "var(--v2-ink-900)",
                  color: "var(--v2-accent)",
                  display: "grid",
                  placeItems: "center",
                  fontFamily: "var(--v2-font-serif)",
                  fontSize: 18,
                  fontWeight: 900,
                  flexShrink: 0,
                }}
              >
                {(row.candidateName ?? "?").charAt(0).toUpperCase()}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: "var(--v2-ink-950)",
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                {row.candidateName ?? "Applicant"}
              </h1>
              {row.headline && (
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--v2-ink-600)",
                    marginTop: 2,
                  }}
                >
                  {row.headline}
                </div>
              )}
              <div
                style={{
                  fontSize: 12,
                  color: "var(--v2-ink-500)",
                  marginTop: 4,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0 8px",
                }}
              >
                <span>
                  Applied for{" "}
                  <Link
                    href={`/jobs/${row.jobId}`}
                    style={{ color: "var(--v2-accent-deep)" }}
                  >
                    {row.jobTitle ?? "this role"}
                  </Link>
                </span>
                <span>·</span>
                <Link
                  href={`/p/${row.candidateId}`}
                  style={{ color: "var(--v2-accent-deep)" }}
                >
                  View public profile
                </Link>
              </div>
            </div>
            <span
              style={{
                padding: "4px 12px",
                borderRadius: 999,
                background: "var(--v2-accent-soft)",
                color: "var(--v2-accent-deep)",
                fontSize: 12,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {stageLabel}
            </span>
          </header>

          {/* Cover note */}
          {row.coverNote && (
            <section
              style={{
                padding: 16,
                background: "white",
                border: "1px solid var(--v2-ink-200)",
                borderRadius: "var(--v2-r-xl)",
                marginBottom: 4,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: "var(--v2-font-mono)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--v2-ink-600)",
                  marginBottom: 8,
                }}
              >
                Cover note
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: "var(--v2-ink-900)",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.55,
                }}
              >
                {row.coverNote}
              </div>
            </section>
          )}

          {row.screeningAnswers.length > 0 && (
            <section
              style={{
                padding: 16,
                background: "white",
                border: "1px solid var(--v2-ink-200)",
                borderRadius: "var(--v2-r-xl)",
                marginBottom: 4,
                marginTop: row.coverNote ? 12 : 0,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: "var(--v2-font-mono)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--v2-ink-600)",
                  marginBottom: 12,
                }}
              >
                Screening answers
              </div>
              <div style={{ display: "grid", gap: 14 }}>
                {row.screeningAnswers.map((sa, i) => (
                  <div key={i}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--v2-ink-700)",
                        marginBottom: 4,
                      }}
                    >
                      {sa.q}
                      {sa.required && (
                        <span
                          style={{
                            marginLeft: 8,
                            fontSize: 10,
                            color: "var(--v2-ink-500)",
                            fontFamily: "var(--v2-font-mono)",
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                          }}
                        >
                          Required
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        color: sa.a ? "var(--v2-ink-900)" : "var(--v2-ink-400)",
                        whiteSpace: "pre-wrap",
                        lineHeight: 1.5,
                        fontStyle: sa.a ? "normal" : "italic",
                      }}
                    >
                      {sa.a || "— Not answered —"}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Interview block */}
          <InterviewBlock
            applicationId={applicationId}
            viewer="employer"
            scheduleSlot={
              <ScheduleInterviewModal
                applicationId={applicationId}
                trigger={<Button size="sm">Schedule interview</Button>}
              />
            }
          />
        </div>
      </main>
    </>
  );
}
