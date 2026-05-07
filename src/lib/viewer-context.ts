import "server-only";
import { and, eq } from "drizzle-orm";
import { getSession } from "@/server/auth";
import { db } from "@/server/db";
import { employerOrgs, orgMembers, user } from "@/server/db/schema";
import { isPlanTier, isJobseekerPlanTier } from "@/lib/billing-tiers";
import type { JobseekerPlanKey, ViewerContext } from "@/lib/card-cta";

/* ---------------------------------------------------------------------------
 * Server-only viewer-context fetcher. Marketing pages call this once on
 * render and pass the result to plan cards so each card can compute its
 * auth-aware CTA via `computeCardCta` (in `card-cta.ts`).
 *
 * Phase B will populate `jobseekerPlan` from a real DB column. Until then,
 * authenticated jobseekers always read as "free".
 * --------------------------------------------------------------------------- */

const EMPTY: ViewerContext = {
  isAuthenticated: false,
  role: null,
  employerPlan: null,
  jobseekerPlan: null,
};

export async function getViewerContext(): Promise<ViewerContext> {
  const session = await getSession();
  if (!session) return EMPTY;

  const role = session.user.role as ViewerContext["role"];

  let employerPlan: ViewerContext["employerPlan"] = null;
  let jobseekerPlan: ViewerContext["jobseekerPlan"] = null;

  if (role === "jobseeker") {
    const [u] = await db
      .select({ jobseekerPlan: user.jobseekerPlan })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);
    const raw = u?.jobseekerPlan;
    jobseekerPlan = (
      isJobseekerPlanTier(raw) ? raw : "free"
    ) as JobseekerPlanKey;
  }

  if (role === "employer" || role === "recruiter" || role === "admin") {
    const userId = session.user.id;
    const email = session.user.email.toLowerCase();

    const [byUser] = await db
      .select({ orgId: orgMembers.orgId })
      .from(orgMembers)
      .where(eq(orgMembers.userId, userId))
      .limit(1);

    let orgId: string | null = byUser?.orgId ?? null;
    if (!orgId) {
      const [byEmail] = await db
        .select({ orgId: orgMembers.orgId })
        .from(orgMembers)
        .where(
          and(
            eq(orgMembers.email, email),
            eq(orgMembers.status, "active"),
          ),
        )
        .limit(1);
      orgId = byEmail?.orgId ?? null;
    }

    if (orgId) {
      const [org] = await db
        .select({ plan: employerOrgs.plan })
        .from(employerOrgs)
        .where(eq(employerOrgs.id, orgId))
        .limit(1);
      if (org) {
        employerPlan = isPlanTier(org.plan) ? org.plan : "none";
      }
    } else {
      employerPlan = "none";
    }
  }

  return {
    isAuthenticated: true,
    role,
    employerPlan,
    jobseekerPlan,
  };
}
