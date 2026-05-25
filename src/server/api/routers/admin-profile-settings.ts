import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, router } from "@/server/api/trpc";
import { staffProfilePrefs, user } from "@/server/db/schema";

export const adminProfileSettingsRouter = router({
  get: adminProcedure.query(async ({ ctx }) => {
    const uid = ctx.session.user.id;

    const [u] = await ctx.db
      .select({
        name: user.name,
        email: user.email,
        image: user.image,
        updatedAt: user.updatedAt,
      })
      .from(user)
      .where(eq(user.id, uid))
      .limit(1);

    if (!u) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
    }

    const [prefs] = await ctx.db
      .select({
        phone: staffProfilePrefs.phone,
        emailNotifications: staffProfilePrefs.emailNotifications,
        pushNotifications: staffProfilePrefs.pushNotifications,
        prefsUpdatedAt: staffProfilePrefs.updatedAt,
      })
      .from(staffProfilePrefs)
      .where(eq(staffProfilePrefs.userId, uid))
      .limit(1);

    const syncKey = `${u.updatedAt.toISOString()}|${prefs?.prefsUpdatedAt?.toISOString() ?? "none"}|${u.image ?? ""}|${prefs?.phone ?? ""}|${prefs?.emailNotifications ?? true}|${prefs?.pushNotifications ?? true}`;

    return {
      syncKey,
      name: u.name,
      email: u.email,
      image: u.image ?? null,
      phone: prefs?.phone ?? "",
      emailNotifications: prefs?.emailNotifications ?? true,
      pushNotifications: prefs?.pushNotifications ?? true,
    };
  }),

  updatePrefs: adminProcedure
    .input(
      z.object({
        phone: z.string().max(40).optional().nullable(),
        emailNotifications: z.boolean(),
        pushNotifications: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const uid = ctx.session.user.id;
      const phoneTrim =
        input.phone === undefined || input.phone === null
          ? null
          : input.phone.trim() === ""
            ? null
            : input.phone.trim();

      await ctx.db
        .insert(staffProfilePrefs)
        .values({
          userId: uid,
          phone: phoneTrim,
          emailNotifications: input.emailNotifications,
          pushNotifications: input.pushNotifications,
        })
        .onConflictDoUpdate({
          target: staffProfilePrefs.userId,
          set: {
            phone: phoneTrim,
            emailNotifications: input.emailNotifications,
            pushNotifications: input.pushNotifications,
            updatedAt: new Date(),
          },
        });

      return { ok: true as const };
    }),
});
