import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import {
  applications,
  certifications,
  education,
  jobListings,
  orgMembers,
  profiles,
  user,
  workHistory,
} from "@/server/db/schema";
import { getSession } from "@/server/auth";
import { recordJobseekerProfileView } from "@/server/services/profile-views";
import { SiteHeader } from "@/components/marketing/site-header";
import { PublicProfileClient } from "./public-profile-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const [u] = await db
    .select({
      name: user.id,
      displayName: user.name,
      role: user.role,
    })
    .from(user)
    .where(eq(user.id, id))
    .limit(1);

  if (!u || u.role === "employer") return { title: "Profile not found" };

  const [p] = await db
    .select({ headline: profiles.headline, location: profiles.location })
    .from(profiles)
    .where(eq(profiles.userId, u.name))
    .limit(1);

  if (!p) return { title: "Profile not found" };

  const title = u.displayName || "Energy professional";
  const descParts = [
    p.headline ?? "Energy professional on Energized",
    p.location ?? null,
  ].filter(Boolean) as string[];

  return {
    title,
    description: descParts.join(" · "),
    openGraph: {
      title,
      description: descParts.join(" · "),
      type: "profile",
    },
    twitter: {
      card: "summary",
      title,
      description: descParts.join(" · "),
    },
    alternates: { canonical: `/p/${id}` },
  };
}

export default async function PublicJobseekerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [u] = await db
    .select({
      id: user.id,
      name: user.name,
      image: user.image,
      role: user.role,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(eq(user.id, id))
    .limit(1);

  if (!u) notFound();
  if (u.role === "employer") notFound();

  const [p] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, u.id))
    .limit(1);

  if (!p) notFound();

  const work = await db
    .select()
    .from(workHistory)
    .where(eq(workHistory.profileId, p.id))
    .orderBy(desc(workHistory.startedAt));

  const certs = await db
    .select()
    .from(certifications)
    .where(
      and(
        eq(certifications.profileId, p.id),
      ),
    )
    .orderBy(asc(certifications.name));

  const edu = await db
    .select()
    .from(education)
    .where(eq(education.profileId, p.id))
    .orderBy(desc(education.endedYear));

  const session = await getSession();
  const viewerIsSelf = session?.user.id === u.id;
  const viewerIsAuthed = Boolean(session);
  const viewerIsEmployer = session?.user.role === "employer";

  const viewerOrgRow = session
    ? (
        await db
          .select({ orgId: orgMembers.orgId })
          .from(orgMembers)
          .where(
            and(
              eq(orgMembers.userId, session.user.id),
              eq(orgMembers.status, "active"),
            ),
          )
          .limit(1)
      )[0]
    : null;
  const viewerHasOrg = Boolean(viewerOrgRow);

  // If the viewer is in an employer org AND this candidate has applied
  // to a job in that org, surface the AI fit-score card on the profile.
  // Pick the most recent application; the score query is keyed on
  // (jobId, candidateId) so it shares cache with the kanban detail page.
  let applicationIdInMyOrg: string | null = null;
  if (viewerOrgRow && !viewerIsSelf) {
    const [hit] = await db
      .select({ applicationId: applications.id })
      .from(applications)
      .innerJoin(jobListings, eq(jobListings.id, applications.jobId))
      .where(
        and(
          eq(applications.candidateId, u.id),
          eq(jobListings.orgId, viewerOrgRow.orgId),
        ),
      )
      .orderBy(desc(applications.createdAt))
      .limit(1);
    applicationIdInMyOrg = hit?.applicationId ?? null;
  }

  await recordJobseekerProfileView({
    subjectUserId: u.id,
    viewerUserId: session?.user.id ?? null,
  });

  return (
    <>
    <SiteHeader />
    <PublicProfileClient
      user={{
        name: u.name,
        image: u.image,
        memberSince: u.createdAt,
      }}
      profile={{
        id: p.id,
        headline: p.headline,
        summary: p.summary,
        location: p.location,
        yearsExperience: p.yearsExperience,
        skills: p.skills,
        openToWork: p.openToWork,
        fifoRotational: p.fifoRotational,
        availability: p.availability,
        remotePreference: p.remotePreference,
        sectors: p.sectors,
      }}
      work={work.map((w) => ({
        id: w.id,
        employerName: w.employerName,
        roleTitle: w.roleTitle,
        site: w.site,
        sector: w.sector,
        summary: w.summary,
        skills: w.skills,
        startedAt: w.startedAt,
        endedAt: w.endedAt,
      }))}
      certs={certs.map((c) => ({
        id: c.id,
        type: c.type,
        name: c.name,
        issuer: c.issuer,
        issuedAt: c.issuedAt,
        expiresAt: c.expiresAt,
      }))}
      education={edu.map((e) => ({
        id: e.id,
        school: e.school,
        degree: e.degree,
        startedYear: e.startedYear,
        endedYear: e.endedYear,
        details: e.details,
      }))}
      viewerIsSelf={viewerIsSelf}
      viewerIsAuthed={viewerIsAuthed}
      viewerIsEmployer={viewerIsEmployer}
      viewerHasOrg={viewerHasOrg}
      candidateUserId={u.id}
      applicationIdInMyOrg={applicationIdInMyOrg}
    />
    </>
  );
}
