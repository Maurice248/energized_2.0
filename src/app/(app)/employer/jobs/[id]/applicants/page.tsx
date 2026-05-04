import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import {
  applications,
  jobListings,
  orgMembers,
  profiles,
  user,
} from "@/server/db/schema";
import { getSession } from "@/server/auth";
import { Icon } from "@/components/shared/icon";
import { ApplicantsBoard } from "./applicants-board";
import type {
  ApplicantRow,
  ApplicationStatus,
} from "./applicant-card";

const EDITOR_ROLES = new Set([
  "owner",
  "admin",
  "recruiter",
  "hiring_manager",
]);

export const metadata: Metadata = { title: "Applicants — Energized" };

export default async function JobApplicantsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const { id } = await params;

  const [job] = await db
    .select({
      id: jobListings.id,
      orgId: jobListings.orgId,
      title: jobListings.title,
      status: jobListings.status,
    })
    .from(jobListings)
    .where(eq(jobListings.id, id))
    .limit(1);
  if (!job) notFound();

  const [member] = await db
    .select({ id: orgMembers.id, role: orgMembers.role })
    .from(orgMembers)
    .where(
      and(
        eq(orgMembers.orgId, job.orgId),
        eq(orgMembers.userId, session.user.id),
      ),
    )
    .limit(1);
  if (!member) notFound();

  const canEdit = EDITOR_ROLES.has(member.role);

  const rows = await db
    .select({
      id: applications.id,
      coverNote: applications.coverNote,
      screeningAnswers: applications.screeningAnswers,
      status: applications.status,
      createdAt: applications.createdAt,
      candidateId: user.id,
      candidateName: user.name,
      candidateImage: user.image,
      headline: profiles.headline,
      location: profiles.location,
      yearsExperience: profiles.yearsExperience,
    })
    .from(applications)
    .innerJoin(user, eq(user.id, applications.candidateId))
    .leftJoin(profiles, eq(profiles.userId, user.id))
    .where(eq(applications.jobId, job.id))
    .orderBy(desc(applications.createdAt));

  const applicants: ApplicantRow[] = rows.map((r) => ({
    id: r.id,
    coverNote: r.coverNote,
    screeningAnswers: r.screeningAnswers,
    status: r.status as ApplicationStatus,
    createdAt: r.createdAt,
    candidateId: r.candidateId,
    candidateName: r.candidateName,
    candidateImage: r.candidateImage,
    headline: r.headline,
    location: r.location,
    yearsExperience: r.yearsExperience,
  }));

  return (
    <div
      className="v2"
      style={{ minHeight: "100vh", background: "var(--v2-ink-50)" }}
    >
      <div
        className="v2-container"
        style={{ paddingTop: 32, paddingBottom: 64, maxWidth: 1440 }}
      >
        <Link
          href="/employer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            color: "var(--v2-ink-500)",
            marginBottom: 28,
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
          Back to dashboard
        </Link>

        <div className="v2-eyebrow">Applicants · {applicants.length}</div>
        <h1
          className="v2-h2"
          style={{
            fontStyle: "italic",
            fontWeight: 900,
            marginTop: 14,
            marginBottom: 8,
          }}
        >
          {job.title ?? "Untitled role"}
        </h1>
        <p style={{ color: "var(--v2-ink-500)", marginBottom: 24 }}>
          {canEdit
            ? "Move applicants through the pipeline as you triage."
            : "Read-only view — only editors can move applicants."}
        </p>

        {applicants.length === 0 ? (
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
              No applicants yet.
            </div>
            <p style={{ color: "var(--v2-ink-500)", marginBottom: 20 }}>
              Share the link to your role.
            </p>
            <div
              style={{
                padding: "10px 14px",
                background: "var(--v2-ink-50)",
                borderRadius: 10,
                fontFamily: "var(--v2-font-mono)",
                fontSize: 12,
                color: "var(--v2-ink-700)",
                display: "inline-block",
              }}
            >
              /jobs/{job.id}
            </div>
          </div>
        ) : (
          <ApplicantsBoard initialApplicants={applicants} canEdit={canEdit} jobId={job.id} />
        )}
      </div>
    </div>
  );
}
