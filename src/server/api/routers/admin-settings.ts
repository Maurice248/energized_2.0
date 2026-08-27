import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, router } from "@/server/api/trpc";
import { auditLog, platformSettings, type PlatformSocialLink } from "@/server/db/schema";
import type { DB } from "@/server/db";
import { PUBLIC_CONTACT_EMAIL } from "@/lib/public-contact-email";
import { DEFAULT_SITE_FOOTER } from "@/lib/site-footer";

function parseEmailFrom(from: string): { name: string; email: string } {
  const trimmed = from.trim();
  const angled = trimmed.match(/^(?:"?([^"<]*)"?)?\s*<([^>]+)>$/);
  if (angled?.[2]) {
    const email = angled[2].trim();
    const rawName = angled[1]?.trim();
    return { name: rawName && rawName.length > 0 ? rawName : "Energized", email };
  }
  return { name: "Energized", email: trimmed };
}

async function defaultInsertValues(): Promise<typeof platformSettings.$inferInsert> {
  const { env } = await import("@/env");
  const { name, email } = parseEmailFrom(env.EMAIL_FROM);
  return {
    siteName: "Energized",
    siteDescription: "Job search platform for Canada's energy sector.",
    siteEmail: PUBLIC_CONTACT_EMAIL,
    sitePhone: null,
    siteAddress: null,
    siteLogo: null,
    siteFavicon: null,
    maintenanceMode: false,
    allowRegistration: true,
    requireEmailVerification: true,
    passwordMinLength: 8,
    sessionTimeoutHours: 24,
    maxLoginAttempts: 5,
    lockoutDurationMinutes: 30,
    emailFromName: name,
    emailFromAddress: email,
    emailReplyTo: email,
    adminNotificationEmail: email,
    enableSms: false,
    googleAnalyticsId: null,
    stripePublishableKey: null,
    socialLinks: [],
    footer: structuredClone(DEFAULT_SITE_FOOTER),
  };
}

function chainMessage(err: unknown): string {
  const parts: string[] = [];
  let cur: unknown = err;
  for (let i = 0; i < 8 && cur; i++) {
    if (cur instanceof Error) {
      parts.push(cur.message);
      cur = cur.cause;
    } else {
      break;
    }
  }
  return parts.join(" ");
}

function isPlatformSettingsTableMissing(err: unknown): boolean {
  const msg = chainMessage(err);
  return msg.includes("platform_settings") && msg.includes("does not exist");
}

async function ensurePlatformSettings(db: DB) {
  try {
    const [row] = await db.select().from(platformSettings).limit(1);
    if (row) return row;
    const defaults = await defaultInsertValues();
    const [created] = await db.insert(platformSettings).values(defaults).returning();
    if (!created) {
      throw new Error("Failed to create platform_settings row.");
    }
    return created;
  } catch (err) {
    if (isPlatformSettingsTableMissing(err)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          'Table "platform_settings" does not exist yet. Run `pnpm db:migrate` on this database, then reload /admin/settings.',
      });
    }
    throw err;
  }
}

const optionalShortText = z.union([z.string().max(500), z.literal(""), z.null()]).transform((v) => {
  if (v === "" || v === null || v === undefined) return null;
  return v;
});

const optionalStripePk = z.union([z.string().max(120), z.literal(""), z.null()]).transform((v) => {
  if (v === "" || v === null || v === undefined) return null;
  return v;
});

const optionalUrlText = z.union([z.string().max(2048), z.literal(""), z.null()]).transform((v) => {
  if (v === "" || v === null || v === undefined) return null;
  return v;
});

const optionalEmail = z
  .union([z.string().email(), z.literal(""), z.null()])
  .transform((v) => (v === "" || v === null ? null : v));

const socialLinkSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(120),
  url: z.string().url(),
  icon: z.string().min(1).max(80),
  order: z.number().int(),
  isActive: z.boolean(),
});

export const platformSettingsUpdateSchema = z.object({
  siteName: z.string().min(1).max(200),
  siteDescription: z.string().min(1).max(4000),
  siteEmail: z.string().email(),
  sitePhone: optionalShortText,
  siteAddress: optionalShortText,
  siteLogo: optionalUrlText,
  siteFavicon: optionalUrlText,
  maintenanceMode: z.boolean(),
  allowRegistration: z.boolean(),
  requireEmailVerification: z.boolean(),
  passwordMinLength: z.number().int().min(6).max(128),
  sessionTimeoutHours: z.number().int().min(1).max(8760),
  maxLoginAttempts: z.number().int().min(1).max(50),
  lockoutDurationMinutes: z.number().int().min(1).max(1440),
  emailFromName: z.string().min(1).max(200),
  emailFromAddress: z.string().email(),
  emailReplyTo: optionalEmail,
  adminNotificationEmail: optionalEmail,
  enableSms: z.boolean(),
  googleAnalyticsId: optionalShortText,
  stripePublishableKey: optionalStripePk,
  socialLinks: z.array(socialLinkSchema),
});

export type PlatformSettingsUpdateInput = z.infer<typeof platformSettingsUpdateSchema>;

export const adminSettingsRouter = router({
  get: adminProcedure.query(async ({ ctx }) => ensurePlatformSettings(ctx.db)),

  update: adminProcedure.input(platformSettingsUpdateSchema).mutation(async ({ ctx, input }) => {
    const current = await ensurePlatformSettings(ctx.db);

    const sortedSocial: PlatformSocialLink[] = [...input.socialLinks].sort((a, b) => a.order - b.order);

    const [updated] = await ctx.db
      .update(platformSettings)
      .set({
        siteName: input.siteName,
        siteDescription: input.siteDescription,
        siteEmail: input.siteEmail,
        sitePhone: input.sitePhone,
        siteAddress: input.siteAddress,
        siteLogo: input.siteLogo,
        siteFavicon: input.siteFavicon,
        maintenanceMode: input.maintenanceMode,
        allowRegistration: input.allowRegistration,
        requireEmailVerification: input.requireEmailVerification,
        passwordMinLength: input.passwordMinLength,
        sessionTimeoutHours: input.sessionTimeoutHours,
        maxLoginAttempts: input.maxLoginAttempts,
        lockoutDurationMinutes: input.lockoutDurationMinutes,
        emailFromName: input.emailFromName,
        emailFromAddress: input.emailFromAddress,
        emailReplyTo: input.emailReplyTo,
        adminNotificationEmail: input.adminNotificationEmail,
        enableSms: input.enableSms,
        googleAnalyticsId: input.googleAnalyticsId,
        stripePublishableKey: input.stripePublishableKey,
        socialLinks: sortedSocial,
        updatedAt: new Date(),
      })
      .where(eq(platformSettings.id, current.id))
      .returning();

    if (!updated) {
      throw new Error("Failed to update platform settings.");
    }

    await ctx.db.insert(auditLog).values({
      actorUserId: ctx.session.user.id,
      actorLabel: ctx.session.user.email,
      action: "platform_settings.updated",
      entityType: "platform_settings",
      entityId: updated.id,
      meta: {},
    });

    return updated;
  }),

  resetToDefaults: adminProcedure.mutation(async ({ ctx }) => {
    const current = await ensurePlatformSettings(ctx.db);
    const defaults = await defaultInsertValues();

    const [updated] = await ctx.db
      .update(platformSettings)
      .set({
        ...defaults,
        updatedAt: new Date(),
      })
      .where(eq(platformSettings.id, current.id))
      .returning();

    if (!updated) {
      throw new Error("Failed to reset platform settings.");
    }

    await ctx.db.insert(auditLog).values({
      actorUserId: ctx.session.user.id,
      actorLabel: ctx.session.user.email,
      action: "platform_settings.reset",
      entityType: "platform_settings",
      entityId: updated.id,
      meta: {},
    });

    return updated;
  }),
});
