import { notFound } from "next/navigation";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import {
  certifications,
  education,
  profiles,
  user,
  workHistory,
} from "@/server/db/schema";
import { getSession } from "@/server/auth";
import { recordJobseekerProfileView } from "@/server/services/profile-views";
import { SiteHeader } from "@/components/marketing/site-header";
import { PublicProfileClient } from "./public-profile-client";

export const metadata = { title: "Profile — Energized" };

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
    />
    </>
  );
}
