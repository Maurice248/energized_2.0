import { TRPCError } from "@trpc/server";
import { and, desc, eq, gt } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";
import { tasks } from "@trigger.dev/sdk/v3";
import { protectedProcedure, router } from "@/server/api/trpc";
import {
  employerOrgs,
  introRequests,
  notifications,
  orgMembers,
  orgRoleEnum,
  profiles,
  user,
} from "@/server/db/schema";

type OrgRole = (typeof orgRoleEnum.enumValues)[number];

async function requireOrgMembership(
  ctx: { db: typeof import("@/server/db").db; session: { user: { id: string } } },
): Promise<{ orgId: string; role: OrgRole }> {
  const [row] = await ctx.db
    .select({ orgId: orgMembers.orgId, role: orgMembers.role })
    .from(orgMembers)
    .where(eq(orgMembers.userId, ctx.session.user.id))
    .limit(1);
  if (!row) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be a member of an employer org.",
    });
  }
  return { orgId: row.orgId, role: row.role };
}

export const introRequestsRouter = router({
  // procs added in subsequent tasks
});
