import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, protectedProcedure } from "@/server/api/trpc";
import { savedCandidates } from "@/server/db/schema/saved-candidates";
import { orgMembers } from "@/server/db/schema/org-members";
import { profiles } from "@/server/db/schema/profiles";
import { user } from "@/server/db/schema/auth";

async function findMyOrgId(ctx: {
  db: typeof import("@/server/db").db;
  session: { user: { id: string; email: string } };
}): Promise<string | null> {
  const userId = ctx.session.user.id;
  const email = ctx.session.user.email.toLowerCase();
  const [byUser] = await ctx.db
    .select({ orgId: orgMembers.orgId })
    .from(orgMembers)
    .where(eq(orgMembers.userId, userId))
    .limit(1);
  if (byUser) return byUser.orgId;
  const [byEmail] = await ctx.db
    .select({ orgId: orgMembers.orgId })
    .from(orgMembers)
    .where(
      and(eq(orgMembers.email, email), eq(orgMembers.status, "active")),
    )
    .limit(1);
  return byEmail?.orgId ?? null;
}

export type SavedCandidateRow = {
  id: string;
  candidateId: string;
  candidateName: string | null;
  candidateImage: string | null;
  headline: string | null;
  location: string | null;
  sectors: string[];
  yearsExperience: number | null;
  openToWork: boolean;
  note: string | null;
  savedByName: string | null;
  savedByEmail: string | null;
  createdAt: Date;
};

export const savedCandidatesRouter = router({
  list: protectedProcedure.query(
    async ({ ctx }): Promise<SavedCandidateRow[]> => {
      if (ctx.session.user.role !== "employer") return [];
      const orgId = await findMyOrgId(ctx);
      if (!orgId) return [];

      const rows = await ctx.db
        .select({
          id: savedCandidates.id,
          candidateId: savedCandidates.candidateUserId,
          candidateName: user.name,
          candidateImage: user.image,
          headline: profiles.headline,
          location: profiles.location,
          sectors: profiles.sectors,
          yearsExperience: profiles.yearsExperience,
          openToWork: profiles.openToWork,
          note: savedCandidates.note,
          savedByUserId: savedCandidates.savedByUserId,
          createdAt: savedCandidates.createdAt,
        })
        .from(savedCandidates)
        .innerJoin(user, eq(user.id, savedCandidates.candidateUserId))
        .leftJoin(profiles, eq(profiles.userId, savedCandidates.candidateUserId))
        .where(eq(savedCandidates.orgId, orgId))
        .orderBy(desc(savedCandidates.createdAt));

      // Resolve savedBy names in a second query to avoid aliasing the user
      // table (Drizzle's aliasedTable degrades type inference for tRPC).
      const savedByIds = Array.from(
        new Set(
          rows
            .map((r) => r.savedByUserId)
            .filter((id): id is string => Boolean(id)),
        ),
      );
      const savedByById = new Map<string, { name: string | null; email: string }>();
      if (savedByIds.length > 0) {
        const sb = await ctx.db
          .select({ id: user.id, name: user.name, email: user.email })
          .from(user)
          .where(inArray(user.id, savedByIds));
        for (const u of sb) savedByById.set(u.id, { name: u.name, email: u.email });
      }

      return rows.map((r) => {
        const sb = r.savedByUserId
          ? (savedByById.get(r.savedByUserId) ?? null)
          : null;
        return {
          id: r.id,
          candidateId: r.candidateId,
          candidateName: r.candidateName,
          candidateImage: r.candidateImage,
          headline: r.headline,
          location: r.location,
          sectors: (r.sectors ?? []) as string[],
          yearsExperience: r.yearsExperience,
          openToWork: r.openToWork ?? false,
          note: r.note,
          savedByName: sb?.name ?? null,
          savedByEmail: sb?.email ?? null,
          createdAt: r.createdAt,
        };
      });
    },
  ),

  isShortlisted: protectedProcedure
    .input(z.object({ candidateId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "employer") return { shortlisted: false };
      const orgId = await findMyOrgId(ctx);
      if (!orgId) return { shortlisted: false };
      const [hit] = await ctx.db
        .select({ id: savedCandidates.id })
        .from(savedCandidates)
        .where(
          and(
            eq(savedCandidates.orgId, orgId),
            eq(savedCandidates.candidateUserId, input.candidateId),
          ),
        )
        .limit(1);
      return { shortlisted: Boolean(hit), id: hit?.id ?? null };
    }),

  save: protectedProcedure
    .input(
      z.object({
        candidateId: z.string(),
        note: z.string().max(500).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "employer") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only employers can shortlist candidates.",
        });
      }
      const orgId = await findMyOrgId(ctx);
      if (!orgId)
        throw new TRPCError({ code: "NOT_FOUND", message: "No org." });

      // Don't shortlist yourself.
      if (input.candidateId === ctx.session.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can't shortlist yourself.",
        });
      }

      const [row] = await ctx.db
        .insert(savedCandidates)
        .values({
          orgId,
          candidateUserId: input.candidateId,
          savedByUserId: ctx.session.user.id,
          note: input.note?.trim() || null,
        })
        .onConflictDoUpdate({
          target: [savedCandidates.orgId, savedCandidates.candidateUserId],
          set: { note: sql`excluded.note` },
        })
        .returning();
      return row;
    }),

  remove: protectedProcedure
    .input(z.object({ candidateId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "employer") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const orgId = await findMyOrgId(ctx);
      if (!orgId) throw new TRPCError({ code: "NOT_FOUND" });

      await ctx.db
        .delete(savedCandidates)
        .where(
          and(
            eq(savedCandidates.orgId, orgId),
            eq(savedCandidates.candidateUserId, input.candidateId),
          ),
        );
      return { ok: true };
    }),
});
