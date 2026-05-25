import { TRPCError } from "@trpc/server";
import { randomUUID } from "node:crypto";
import { and, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import { z } from "zod";
import { hashPassword } from "better-auth/crypto";
import { adminProcedure, router } from "@/server/api/trpc";
import { auth } from "@/server/auth";
import { deleteBlob, isManagedAvatarBlobUrl } from "@/lib/blob";
import { account, auditLog, profiles, user } from "@/server/db/schema";

const userRoleSchema = z.enum(["jobseeker", "employer", "recruiter", "admin"]);

/** Roles admins may assign on create or filter by in the users list (no standalone recruiter accounts). */
const adminAssignableRoleSchema = z.enum(["jobseeker", "employer", "admin"]);

export const adminUsersRouter = router({
  list: adminProcedure
    .input(
      z
        .object({
          search: z.string().max(200).optional(),
          role: adminAssignableRoleSchema.optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const q = input?.search?.trim() ?? "";
      const roleFilter = input?.role;

      const conditions = [];
      if (q.length > 0) {
        const needle = `%${q}%`;
        conditions.push(
          or(ilike(user.name, needle), ilike(user.email, needle)),
        );
      }
      if (roleFilter) {
        conditions.push(eq(user.role, roleFilter));
      }

      const rows = await ctx.db
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
          phone: profiles.phone,
        })
        .from(user)
        .leftJoin(profiles, eq(profiles.userId, user.id))
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(user.createdAt));

      return {
        currentUserId: ctx.session.user.id,
        users: rows,
      };
    }),

  stats: adminProcedure.query(async ({ ctx }) => {
    const [row] = await ctx.db
      .select({
        total: sql<number>`count(*)::int`,
        adminCount: sql<number>`count(*) filter (where ${user.role} = 'admin')::int`,
        employerCount: sql<number>`count(*) filter (where ${user.role} = 'employer')::int`,
        jobseekerCount: sql<number>`count(*) filter (where ${user.role} = 'jobseeker')::int`,
      })
      .from(user);

    return {
      total: row?.total ?? 0,
      admin: row?.adminCount ?? 0,
      employer: row?.employerCount ?? 0,
      jobseeker: row?.jobseekerCount ?? 0,
    };
  }),

  create: adminProcedure
    .input(
      z.object({
        email: z.string().email().max(240),
        password: z.string().min(8).max(128),
        name: z.string().min(1).max(200),
        role: adminAssignableRoleSchema,
        phone: z.string().max(40).optional(),
        staffPosition: z.string().max(120).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const normalized = input.email.trim().toLowerCase();

      const [taken] = await ctx.db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.email, normalized))
        .limit(1);

      if (taken) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "That email is already in use.",
        });
      }

      const res = await auth.api.signUpEmail({
        body: {
          email: normalized,
          password: input.password,
          name: input.name.trim(),
        },
        headers: new Headers(),
      });

      const userId = res?.user?.id;
      if (!userId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Account creation failed.",
        });
      }

      const staffPos =
        input.role === "admin" && input.staffPosition?.trim()
          ? input.staffPosition.trim()
          : undefined;

      await ctx.db
        .update(user)
        .set({
          role: input.role,
          emailVerified: true,
          updatedAt: new Date(),
          ...(staffPos !== undefined ? { staffPosition: staffPos } : {}),
        })
        .where(eq(user.id, userId));

      const phoneTrim = input.phone?.trim();
      if (phoneTrim) {
        const [profileRow] = await ctx.db
          .select({ id: profiles.id })
          .from(profiles)
          .where(eq(profiles.userId, userId))
          .limit(1);

        if (profileRow) {
          await ctx.db
            .update(profiles)
            .set({ phone: phoneTrim })
            .where(eq(profiles.userId, userId));
        } else {
          await ctx.db.insert(profiles).values({
            userId,
            phone: phoneTrim,
          });
        }
      }

      await ctx.db.insert(auditLog).values({
        actorUserId: ctx.session.user.id,
        actorLabel: ctx.session.user.name ?? undefined,
        action: "user.create.admin",
        entityType: "user",
        entityId: userId,
        meta: { email: normalized, role: input.role },
      });

      return { userId };
    }),

  update: adminProcedure
    .input(
      z.object({
        userId: z.string().min(1),
        name: z.string().min(1).max(200).optional(),
        role: userRoleSchema.optional(),
        phone: z.string().max(40).optional().nullable(),
        staffPosition: z.string().max(120).optional().nullable(),
        image: z.union([z.string().url().max(2048), z.null()]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { userId, name, role, phone, staffPosition, image } = input;

      const [existing] = await ctx.db
        .select({ id: user.id, role: user.role, image: user.image })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
      }

      if (
        role !== undefined &&
        existing.role === "admin" &&
        role !== "admin"
      ) {
        const [{ n }] = await ctx.db
          .select({ n: sql<number>`count(*)::int` })
          .from(user)
          .where(eq(user.role, "admin"));
        if ((n ?? 0) <= 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "You cannot remove the last platform administrator.",
          });
        }
      }

      const nextRole = role ?? existing.role;

      const userPatch: {
        name?: string;
        role?: string;
        staffPosition?: string | null;
        image?: string | null;
      } = {};

      if (name !== undefined) userPatch.name = name;
      if (role !== undefined) userPatch.role = role;

      let nextImage: string | null | undefined;
      if (image !== undefined) {
        nextImage = image === null ? null : image.trim() === "" ? null : image.trim();
        userPatch.image = nextImage;
      }

      if (nextRole !== "admin") {
        if (existing.role === "admin") {
          userPatch.staffPosition = null;
        }
      } else if (staffPosition !== undefined) {
        userPatch.staffPosition = staffPosition?.trim()
          ? staffPosition.trim()
          : null;
      }

      if (Object.keys(userPatch).length > 0) {
        await ctx.db
          .update(user)
          .set({
            ...userPatch,
            updatedAt: new Date(),
          })
          .where(eq(user.id, userId));
      }

      if (
        image !== undefined &&
        existing.image &&
        nextImage !== undefined &&
        existing.image !== nextImage &&
        isManagedAvatarBlobUrl(existing.image)
      ) {
        try {
          await deleteBlob(existing.image);
        } catch {
          /* ignore */
        }
      }

      if (
        role !== undefined &&
        existing.role !== "admin" &&
        role === "admin"
      ) {
        await ctx.db.insert(auditLog).values({
          actorUserId: ctx.session.user.id,
          actorLabel: ctx.session.user.name ?? undefined,
          action: "staff.promote",
          entityType: "user",
          entityId: userId,
          meta: { previousRole: existing.role },
        });
      }

      if (phone !== undefined) {
        const [profileRow] = await ctx.db
          .select({ id: profiles.id })
          .from(profiles)
          .where(eq(profiles.userId, userId))
          .limit(1);

        if (profileRow) {
          await ctx.db
            .update(profiles)
            .set({ phone: phone ?? null })
            .where(eq(profiles.userId, userId));
        } else if (phone !== null && phone !== "") {
          await ctx.db.insert(profiles).values({
            userId,
            phone,
          });
        }
      }

      return { ok: true as const };
    }),

  changeEmail: adminProcedure
    .input(
      z.object({
        userId: z.string().min(1),
        newEmail: z.string().email().max(240),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const normalized = input.newEmail.trim().toLowerCase();

      const [existing] = await ctx.db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.id, input.userId))
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
      }

      const [emailTaken] = await ctx.db
        .select({ id: user.id })
        .from(user)
        .where(and(eq(user.email, normalized), ne(user.id, input.userId)))
        .limit(1);

      if (emailTaken) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "That email is already in use.",
        });
      }

      await ctx.db
        .update(user)
        .set({
          email: normalized,
          emailVerified: false,
        })
        .where(eq(user.id, input.userId));

      return { ok: true as const };
    }),

  setPassword: adminProcedure
    .input(
      z.object({
        userId: z.string().min(1),
        newPassword: z.string().min(8).max(128),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [target] = await ctx.db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.id, input.userId))
        .limit(1);

      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
      }

      const hashed = await hashPassword(input.newPassword);

      const [cred] = await ctx.db
        .select({ id: account.id })
        .from(account)
        .where(
          and(eq(account.userId, input.userId), eq(account.providerId, "credential")),
        )
        .limit(1);

      if (cred) {
        await ctx.db
          .update(account)
          .set({ password: hashed })
          .where(eq(account.id, cred.id));
      } else {
        const now = new Date();
        await ctx.db.insert(account).values({
          id: randomUUID(),
          accountId: input.userId,
          providerId: "credential",
          userId: input.userId,
          password: hashed,
          createdAt: now,
          updatedAt: now,
        });
      }

      return { ok: true as const };
    }),

  deleteUser: adminProcedure
    .input(z.object({ userId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.session.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot delete your own account.",
        });
      }

      const [target] = await ctx.db
        .select({ id: user.id, role: user.role })
        .from(user)
        .where(eq(user.id, input.userId))
        .limit(1);

      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
      }

      if (target.role === "admin") {
        const [{ n }] = await ctx.db
          .select({ n: sql<number>`count(*)::int` })
          .from(user)
          .where(eq(user.role, "admin"));
        if ((n ?? 0) <= 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "You cannot delete the last platform administrator.",
          });
        }
      }

      await ctx.db.delete(user).where(eq(user.id, input.userId));

      return { ok: true as const };
    }),
});
