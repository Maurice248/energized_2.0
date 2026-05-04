import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getSession } from "@/server/auth";
import { db } from "@/server/db";
import {
  applications,
  employerOrgs,
  interviewSlots,
  interviews,
  jobListings,
  orgMembers,
  user,
} from "@/server/db/schema";
import { buildInterviewIcs } from "@/lib/ics";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const [iv] = await db
    .select({
      interviewId: interviews.id,
      status: interviews.status,
      durationMin: interviews.durationMin,
      details: interviews.details,
      notes: interviews.notes,
      confirmedSlotId: interviews.confirmedSlotId,
      candidateId: applications.candidateId,
      candidateName: user.name,
      candidateEmail: user.email,
      orgId: employerOrgs.id,
      orgName: employerOrgs.name,
      jobTitle: jobListings.title,
      proposedById: interviews.proposedById,
    })
    .from(interviews)
    .innerJoin(applications, eq(applications.id, interviews.applicationId))
    .innerJoin(user, eq(user.id, applications.candidateId))
    .innerJoin(jobListings, eq(jobListings.id, applications.jobId))
    .innerJoin(employerOrgs, eq(employerOrgs.id, jobListings.orgId))
    .where(eq(interviews.id, id))
    .limit(1);

  if (!iv) return new NextResponse("Not found", { status: 404 });
  if (iv.status !== "confirmed" || !iv.confirmedSlotId)
    return new NextResponse("Not confirmed", { status: 409 });

  const isCandidate = iv.candidateId === session.user.id;
  if (!isCandidate) {
    const [member] = await db
      .select({ role: orgMembers.role })
      .from(orgMembers)
      .where(and(eq(orgMembers.orgId, iv.orgId), eq(orgMembers.userId, session.user.id)))
      .limit(1);
    if (!member) return new NextResponse("Forbidden", { status: 403 });
  }

  const [slot] = await db
    .select({ startsAt: interviewSlots.startsAt })
    .from(interviewSlots)
    .where(eq(interviewSlots.id, iv.confirmedSlotId))
    .limit(1);
  if (!slot) return new NextResponse("Slot missing", { status: 500 });

  // Resolve proposer display name (best-effort).
  let proposerName = "Energized";
  let proposerEmail = "no-reply@energized.biz";
  if (iv.proposedById) {
    const [p] = await db
      .select({ name: user.name, email: user.email })
      .from(user)
      .where(eq(user.id, iv.proposedById))
      .limit(1);
    if (p) {
      proposerName = p.name ?? "Energized";
      proposerEmail = p.email;
    }
  }

  const body = buildInterviewIcs({
    interviewId: iv.interviewId,
    startsAtUtc: new Date(slot.startsAt),
    durationMin: iv.durationMin,
    jobTitle: iv.jobTitle ?? "Role",
    companyName: iv.orgName,
    proposerName,
    proposerEmail,
    candidateName: iv.candidateName ?? "Candidate",
    candidateEmail: iv.candidateEmail,
    notes: iv.notes ?? undefined,
    details: iv.details,
  });

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="interview-${iv.interviewId.slice(0, 8)}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
