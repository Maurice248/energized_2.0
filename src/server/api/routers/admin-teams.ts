import { TRPCError } from "@trpc/server";
import { and, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import { z } from "zod";
import { adminProcedure, router } from "@/server/api/trpc";
import type { DB } from "@/server/db";
import { auditLog, profiles, user } from "@/server/db/schema";

async function countPlatformAdmins(db: DB): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(user)
    .where(eq(user.role, "admin"));
  return row?.n ?? 0;
}

const RESTORE_ROLES = ["jobseeker", "employer", "recruiter"] as const;
type RestoreRole = (typeof RESTORE_ROLES)[number];

function parseRestoreRole(value: unknown): RestoreRole | null {
  if (typeof value !== "string") return null;
  return RESTORE_ROLES.includes(value as RestoreRole)
    ? (value as RestoreRole)
    : null;
}

export const adminTeamsRouter = router({
  list: adminProcedure
    .input(z.object({ search: z.string().max(200).optional() }).optional())
    .query(async ({ ctx, input }) => {
      const q = input?.search?.trim() ?? "";
      const roleCond = eq(user.role, "admin");
      const searchCond =
        q.length > 0
          ? or(
              ilike(user.name, `%${q}%`),
              ilike(user.email, `%${q}%`),
              ilike(user.staffPosition, `%${q}%`),
              ilike(profiles.phone, `%${q}%`),
            )
          : undefined;

      const whereClause =
        q.length > 0
          ? searchCond
          : roleCond;

      const rows = await ctx.db
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
          emailVerified: user.emailVerified,
          phone: profiles.phone,
          staffPosition: user.staffPosition,
          image: user.image,
          role: user.role,
        })
        .from(user)
        .leftJoin(profiles, eq(profiles.userId, user.id))
        .where(whereClause)
        .orderBy(desc(user.createdAt))
        .limit(q.length > 0 ? 100 : 500);

      return {
        currentUserId: ctx.session.user.id,
        members: rows,
      };
    }),

  stats: adminProcedure.query(async ({ ctx }) => {
    const [row] = await ctx.db
      .select({
        total: sql<number>`count(*)::int`,
        verified: sql<number>`count(*) filter (where ${user.emailVerified})::int`,
        recent: sql<number>`count(*) filter (where ${user.createdAt} >= now() - interval '30 days')::int`,
      })
      .from(user)
      .where(eq(user.role, "admin"));

    return {
      total: row?.total ?? 0,
      verified: row?.verified ?? 0,
      joinedLast30Days: row?.recent ?? 0,
    };
  }),

  promoteByEmail: adminProcedure
    .input(
      z.object({
        email: z.string().email().max(240),
        phone: z.string().max(40).optional(),
        staffPosition: z.string().max(120).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const normalized = input.email.trim().toLowerCase();

      const [existing] = await ctx.db
        .select({
          id: user.id,
          role: user.role,
        })
        .from(user)
        .where(eq(user.email, normalized))
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No account exists with that email. Create a user first or send an invite with a new password.",
        });
      }

      if (existing.role === "admin") {
        return { userId: existing.id, alreadyAdmin: true as const };
      }

      await ctx.db
        .update(user)
        .set({
          role: "admin",
          updatedAt: new Date(),
          ...(input.staffPosition?.trim()
            ? { staffPosition: input.staffPosition.trim() }
            : {}),
        })
        .where(eq(user.id, existing.id));

      const phoneTrim = input.phone?.trim();
      if (phoneTrim) {
        const [profileRow] = await ctx.db
          .select({ id: profiles.id })
          .from(profiles)
          .where(eq(profiles.userId, existing.id))
          .limit(1);

        if (profileRow) {
          await ctx.db
            .update(profiles)
            .set({ phone: phoneTrim })
            .where(eq(profiles.userId, existing.id));
        } else {
          await ctx.db.insert(profiles).values({
            userId: existing.id,
            phone: phoneTrim,
          });
        }
      }

      await ctx.db.insert(auditLog).values({
        actorUserId: ctx.session.user.id,
        actorLabel: ctx.session.user.name ?? undefined,
        action: "staff.promote",
        entityType: "user",
        entityId: existing.id,
        meta: { email: normalized, previousRole: existing.role },
      });

      return { userId: existing.id, alreadyAdmin: false as const };
    }),

  demote: adminProcedure
    .input(z.object({ userId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const [target] = await ctx.db
        .select({
          id: user.id,
          role: user.role,
          email: user.email,
        })
        .from(user)
        .where(eq(user.id, input.userId))
        .limit(1);

      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
      }

      if (target.role !== "admin") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "That account is not on the platform admin team.",
        });
      }

      const admins = await countPlatformAdmins(ctx.db);
      if (admins <= 1) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot remove the last platform administrator.",
        });
      }

      const [promoRow] = await ctx.db
        .select({ meta: auditLog.meta })
        .from(auditLog)
        .where(
          and(
            eq(auditLog.action, "staff.promote"),
            eq(auditLog.entityId, input.userId),
          ),
        )
        .orderBy(desc(auditLog.at))
        .limit(1);

      const fromPromote =
        promoRow?.meta &&
        typeof promoRow.meta === "object" &&
        promoRow.meta !== null &&
        "previousRole" in promoRow.meta
          ? parseRestoreRole(
              (promoRow.meta as Record<string, unknown>).previousRole,
            )
          : null;

      const nextRole: RestoreRole = fromPromote ?? "jobseeker";

      await ctx.db
        .update(user)
        .set({
          role: nextRole,
          staffPosition: null,
          updatedAt: new Date(),
        })
        .where(eq(user.id, input.userId));

      await ctx.db.insert(auditLog).values({
        actorUserId: ctx.session.user.id,
        actorLabel: ctx.session.user.name ?? undefined,
        action: "staff.demote",
        entityType: "user",
        entityId: input.userId,
        meta: { email: target.email, restoredRole: nextRole },
      });

      return { ok: true as const };
    }),

  markEmailVerified: adminProcedure
    .input(z.object({ userId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.session.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Use account settings to verify your own email.",
        });
      }

      const [target] = await ctx.db
        .select({
          id: user.id,
          role: user.role,
          emailVerified: user.emailVerified,
        })
        .from(user)
        .where(
          and(eq(user.id, input.userId), eq(user.role, "admin"), ne(user.id, ctx.session.user.id)),
        )
        .limit(1);

      if (!target) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Staff member not found.",
        });
      }

      if (target.emailVerified) {
        return { ok: true as const, changed: false as const };
      }

      await ctx.db
        .update(user)
        .set({ emailVerified: true, updatedAt: new Date() })
        .where(eq(user.id, input.userId));

      await ctx.db.insert(auditLog).values({
        actorUserId: ctx.session.user.id,
        actorLabel: ctx.session.user.name ?? undefined,
        action: "staff.email_verified.admin_override",
        entityType: "user",
        entityId: input.userId,
        meta: {},
      });

      return { ok: true as const, changed: true as const };
    }),
});
