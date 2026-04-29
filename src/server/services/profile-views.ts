import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { orgMembers, profileViews } from "@/server/db/schema";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function recordJobseekerProfileView(input: {
  subjectUserId: string;
  viewerUserId: string | null;
}) {
  if (input.viewerUserId && input.viewerUserId === input.subjectUserId) return;
  await db.insert(profileViews).values({
    subjectUserId: input.subjectUserId,
    viewerUserId: input.viewerUserId,
  });
}

export async function recordEmployerOrgView(input: {
  orgId: string;
  viewerUserId: string | null;
}) {
  if (input.viewerUserId) {
    const [member] = await db
      .select({ id: orgMembers.id })
      .from(orgMembers)
      .where(
        and(
          eq(orgMembers.orgId, input.orgId),
          eq(orgMembers.userId, input.viewerUserId),
          eq(orgMembers.status, "active"),
        ),
      )
      .limit(1);
    if (member) return;
  }
  await db.insert(profileViews).values({
    subjectOrgId: input.orgId,
    viewerUserId: input.viewerUserId,
  });
}

export async function countJobseekerProfileViews30d(subjectUserId: string) {
  const cutoff = new Date(Date.now() - THIRTY_DAYS_MS);
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(profileViews)
    .where(
      and(
        eq(profileViews.subjectUserId, subjectUserId),
        gte(profileViews.viewedAt, cutoff),
      ),
    );
  return row?.count ?? 0;
}

export async function countEmployerOrgViewsSince(orgId: string, since: Date | null) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(profileViews)
    .where(
      since
        ? and(
            eq(profileViews.subjectOrgId, orgId),
            gte(profileViews.viewedAt, since),
          )
        : eq(profileViews.subjectOrgId, orgId),
    );
  return row?.count ?? 0;
}
