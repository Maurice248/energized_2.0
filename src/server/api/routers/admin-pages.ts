import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";
import { adminProcedure, router } from "@/server/api/trpc";
import { auditLog, pages, platformSettings } from "@/server/db/schema";
import { MARKETING_PAGE_FALLBACKS } from "@/lib/marketing-page-fallbacks";
import { PUBLIC_CONTACT_EMAIL } from "@/lib/public-contact-email";
import {
  DEFAULT_SITE_FOOTER,
  normalizeSiteFooter,
  parseSiteFooter,
  siteFooterSchema,
} from "@/lib/site-footer";
import { normalizeStoredCmsBody } from "@/lib/cms-page-sections";
import { SURFACE_CMS_PUBLIC_SLUGS } from "@/lib/surface-cms-seeds";
import { seedSystemPagesTables } from "@/server/services/seed-system-pages";

/**
 * Slugs reserved by existing top-level routes or framework prefixes — admins
 * cannot create new CMS records that would shadow real app routes.
 *
 * Slugs in MARKETING_STATIC_SLUGS *are* allowed because we seed them as system
 * records so admins can edit them; the public render at `/[slug]` will simply
 * be shadowed by the static (marketing) route until that file is removed.
 */
const RESERVED_SLUGS = new Set<string>([
  "admin",
  "api",
  "_next",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "sign-in",
  "sign-up",
  "verify-email",
  "reset-password",
  "forgot-password",
  "accept-invite",
  "dashboard",
  "jobs",
  "saved",
  "notifications",
  "applications",
  "employer",
  "candidates",
  "skills",
  "trainings",
  "shortlist",
  "onboarding",
  "account",
  "profile",
  "saved-searches",
  "intro-requests",
  "p",
  "c",
  "faqs",
]);

export const MARKETING_STATIC_SLUGS = MARKETING_PAGE_FALLBACKS.map(
  (f) => f.slug,
) as readonly string[];

/**
 * Slugs that are served by a hard-coded marketing route. Those routes now
 * defer to the CMS row when published, so the flag is informational rather
 * than a hard "edits won't go live" warning.
 */
const PUBLIC_SYSTEM_SURFACE_SLUGS = new Set<string>([
  ...MARKETING_STATIC_SLUGS,
  ...SURFACE_CMS_PUBLIC_SLUGS,
]);

export const slugSchema = z
  .string()
  .trim()
  .min(1, "Slug is required.")
  .max(80, "Slug must be 80 characters or fewer.")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug must be lowercase letters, digits, and single dashes (kebab-case).",
  )
  .refine((slug) => !RESERVED_SLUGS.has(slug), {
    message: "That slug is reserved by an existing route.",
  });

export { RESERVED_SLUGS };

const titleSchema = z
  .string()
  .trim()
  .min(1, "Title is required.")
  .max(160, "Title must be 160 characters or fewer.");

const bodySchema = z
  .string()
  .max(200_000, "Body must be 200,000 characters or fewer.");

const seoTitleSchema = z
  .string()
  .max(160, "SEO title must be 160 characters or fewer.")
  .nullable()
  .optional();

const seoDescriptionSchema = z
  .string()
  .max(320, "SEO description must be 320 characters or fewer.")
  .nullable()
  .optional();

const statusSchema = z.enum(["draft", "published"]);

const bodyFormatSchema = z.enum(["markdown", "html"]);

function normalizeStoredBody(body: string, format: "markdown" | "html"): string {
  return normalizeStoredCmsBody(body, format);
}

const createPageSchema = z.object({
  slug: slugSchema,
  title: titleSchema,
  body: bodySchema.optional().default(""),
  bodyFormat: bodyFormatSchema.default("html"),
  seoTitle: seoTitleSchema,
  seoDescription: seoDescriptionSchema,
  status: statusSchema.default("draft"),
});

const updatePageSchema = z.object({
  id: z.string().uuid(),
  slug: slugSchema.optional(),
  title: titleSchema.optional(),
  body: bodySchema.optional(),
  bodyFormat: bodyFormatSchema.optional(),
  seoTitle: seoTitleSchema,
  seoDescription: seoDescriptionSchema,
  status: statusSchema.optional(),
});

export const contactEmailSchema = z
  .string()
  .trim()
  .min(1, "Email is required.")
  .max(254, "Email must be 254 characters or fewer.")
  .email("Enter a valid email address.");

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

const listInputSchema = z
  .object({
    search: z.string().trim().max(200).optional(),
    status: z.enum(["all", "draft", "published"]).default("all"),
  })
  .optional();

function shapeRow(row: typeof pages.$inferSelect) {
  return {
    ...row,
    /** True for the seven slugs that have a corresponding marketing route file. */
    servedByMarketingRoute: PUBLIC_SYSTEM_SURFACE_SLUGS.has(row.slug),
  };
}

export const adminPagesRouter = router({
  list: adminProcedure.input(listInputSchema).query(async ({ ctx, input }) => {
    const q = input?.search?.trim() ?? "";
    const status = input?.status ?? "all";

    const conditions = [] as Array<ReturnType<typeof eq>>;
    if (q.length > 0) {
      const needle = `%${q}%`;
      conditions.push(
        or(ilike(pages.title, needle), ilike(pages.slug, needle)) as ReturnType<
          typeof eq
        >,
      );
    }
    if (status !== "all") {
      conditions.push(eq(pages.status, status));
    }

    const rows = await ctx.db
      .select()
      .from(pages)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(pages.updatedAt));

    return rows.map(shapeRow);
  }),

  stats: adminProcedure.query(async ({ ctx }) => {
    const [row] = await ctx.db
      .select({
        total: count(),
        published: sql<number>`count(*) filter (where ${pages.status} = 'published')::int`,
        drafts: sql<number>`count(*) filter (where ${pages.status} = 'draft')::int`,
        system: sql<number>`count(*) filter (where ${pages.isSystem})::int`,
      })
      .from(pages);

    return {
      total: Number(row?.total ?? 0),
      published: Number(row?.published ?? 0),
      drafts: Number(row?.drafts ?? 0),
      system: Number(row?.system ?? 0),
    };
  }),

  get: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(pages)
        .where(eq(pages.id, input.id))
        .limit(1);
      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Page not found." });
      }
      return shapeRow(row);
    }),

  create: adminProcedure
    .input(createPageSchema)
    .mutation(async ({ ctx, input }) => {
      const slug = input.slug.toLowerCase();

      const [existing] = await ctx.db
        .select({ id: pages.id })
        .from(pages)
        .where(eq(pages.slug, slug))
        .limit(1);
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A page with that slug already exists.",
        });
      }

      const body = normalizeStoredBody(input.body ?? "", input.bodyFormat);

      const [row] = await ctx.db
        .insert(pages)
        .values({
          slug,
          title: input.title,
          body,
          bodyFormat: input.bodyFormat,
          seoTitle: input.seoTitle ?? null,
          seoDescription: input.seoDescription ?? null,
          status: input.status,
          isSystem: false,
          updatedByUserId: ctx.session.user.id,
        })
        .returning();

      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create page.",
        });
      }

      await ctx.db.insert(auditLog).values({
        actorUserId: ctx.session.user.id,
        actorLabel: ctx.session.user.email,
        action: "page.created",
        entityType: "page",
        entityId: row.id,
        meta: { slug: row.slug, title: row.title, status: row.status },
      });

      return shapeRow(row);
    }),

  update: adminProcedure
    .input(updatePageSchema)
    .mutation(async ({ ctx, input }) => {
      const [current] = await ctx.db
        .select()
        .from(pages)
        .where(eq(pages.id, input.id))
        .limit(1);
      if (!current) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Page not found." });
      }

      if (
        input.bodyFormat !== undefined &&
        input.body === undefined &&
        input.bodyFormat !== current.bodyFormat
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Include body content in the same save when switching between Markdown and HTML.",
        });
      }

      // System pages: slug is locked because it identifies the seeded marketing route.
      if (current.isSystem && input.slug && input.slug !== current.slug) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "The slug for a system page cannot be changed.",
        });
      }

      const nextSlug = input.slug ? input.slug.toLowerCase() : current.slug;

      if (nextSlug !== current.slug) {
        const [conflict] = await ctx.db
          .select({ id: pages.id })
          .from(pages)
          .where(eq(pages.slug, nextSlug))
          .limit(1);
        if (conflict && conflict.id !== current.id) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Another page already uses that slug.",
          });
        }
      }

      const nextFormat = input.bodyFormat ?? current.bodyFormat;

      const patch: Partial<typeof pages.$inferInsert> = {
        updatedByUserId: ctx.session.user.id,
      };
      if (input.slug !== undefined) patch.slug = nextSlug;
      if (input.title !== undefined) patch.title = input.title;
      if (input.body !== undefined) {
        patch.body = normalizeStoredBody(input.body, nextFormat);
      }
      if (input.bodyFormat !== undefined) patch.bodyFormat = input.bodyFormat;
      if (input.seoTitle !== undefined) patch.seoTitle = input.seoTitle ?? null;
      if (input.seoDescription !== undefined) {
        patch.seoDescription = input.seoDescription ?? null;
      }
      if (input.status !== undefined) patch.status = input.status;

      const [row] = await ctx.db
        .update(pages)
        .set(patch)
        .where(eq(pages.id, input.id))
        .returning();

      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update page.",
        });
      }

      await ctx.db.insert(auditLog).values({
        actorUserId: ctx.session.user.id,
        actorLabel: ctx.session.user.email,
        action: "page.updated",
        entityType: "page",
        entityId: row.id,
        meta: {
          slug: row.slug,
          status: row.status,
          changedFields: Object.keys(patch).filter(
            (k) => k !== "updatedByUserId",
          ),
        },
      });

      return shapeRow(row);
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [current] = await ctx.db
        .select()
        .from(pages)
        .where(eq(pages.id, input.id))
        .limit(1);
      if (!current) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Page not found." });
      }
      if (current.isSystem) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "System pages cannot be deleted. Set their status to draft instead.",
        });
      }

      await ctx.db.delete(pages).where(eq(pages.id, input.id));

      await ctx.db.insert(auditLog).values({
        actorUserId: ctx.session.user.id,
        actorLabel: ctx.session.user.email,
        action: "page.deleted",
        entityType: "page",
        entityId: current.id,
        meta: { slug: current.slug, title: current.title },
      });

      return { id: current.id };
    }),

  /**
   * Public inbox shown on `/contact` and used as the contact-form destination.
   * Stored on `platform_settings.site_email` (same field as /admin/settings).
   */
  getContactEmail: adminProcedure.query(async ({ ctx }) => {
    try {
      const [row] = await ctx.db
        .select({ email: platformSettings.siteEmail })
        .from(platformSettings)
        .limit(1);
      const email = row?.email?.trim() || PUBLIC_CONTACT_EMAIL;
      return { email };
    } catch (err) {
      if (isPlatformSettingsTableMissing(err)) {
        return { email: PUBLIC_CONTACT_EMAIL };
      }
      throw err;
    }
  }),

  updateContactEmail: adminProcedure
    .input(z.object({ email: contactEmailSchema }))
    .mutation(async ({ ctx, input }) => {
      const email = input.email;

      try {
        const [current] = await ctx.db
          .select({ id: platformSettings.id })
          .from(platformSettings)
          .limit(1);

        let settingsId: string;
        if (current) {
          const [updated] = await ctx.db
            .update(platformSettings)
            .set({ siteEmail: email, updatedAt: new Date() })
            .where(eq(platformSettings.id, current.id))
            .returning({ id: platformSettings.id });
          if (!updated) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to update contact email.",
            });
          }
          settingsId = updated.id;
        } else {
          const [created] = await ctx.db
            .insert(platformSettings)
            .values({ siteEmail: email })
            .returning({ id: platformSettings.id });
          if (!created) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to save contact email.",
            });
          }
          settingsId = created.id;
        }

        await ctx.db.insert(auditLog).values({
          actorUserId: ctx.session.user.id,
          actorLabel: ctx.session.user.email,
          action: "platform_settings.site_email.updated",
          entityType: "platform_settings",
          entityId: settingsId,
          meta: { siteEmail: email, source: "admin.pages" },
        });

        return { email };
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        if (isPlatformSettingsTableMissing(err)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              'Table "platform_settings" does not exist yet. Run `pnpm db:migrate` on this database, then try again.',
          });
        }
        throw err;
      }
    }),

  getFooter: adminProcedure.query(async ({ ctx }) => {
    try {
      const [row] = await ctx.db
        .select({ footer: platformSettings.footer })
        .from(platformSettings)
        .limit(1);
      return parseSiteFooter(row?.footer ?? null);
    } catch (err) {
      if (isPlatformSettingsTableMissing(err)) {
        return structuredClone(DEFAULT_SITE_FOOTER);
      }
      throw err;
    }
  }),

  updateFooter: adminProcedure
    .input(siteFooterSchema)
    .mutation(async ({ ctx, input }) => {
      const footer = normalizeSiteFooter(input);

      try {
        const [current] = await ctx.db
          .select({ id: platformSettings.id })
          .from(platformSettings)
          .limit(1);

        let settingsId: string;
        if (current) {
          const [updated] = await ctx.db
            .update(platformSettings)
            .set({ footer, updatedAt: new Date() })
            .where(eq(platformSettings.id, current.id))
            .returning({ id: platformSettings.id });
          if (!updated) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to update footer.",
            });
          }
          settingsId = updated.id;
        } else {
          const [created] = await ctx.db
            .insert(platformSettings)
            .values({ footer })
            .returning({ id: platformSettings.id });
          if (!created) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to save footer.",
            });
          }
          settingsId = created.id;
        }

        await ctx.db.insert(auditLog).values({
          actorUserId: ctx.session.user.id,
          actorLabel: ctx.session.user.email,
          action: "platform_settings.footer.updated",
          entityType: "platform_settings",
          entityId: settingsId,
          meta: { source: "admin.pages" },
        });

        return footer;
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        if (isPlatformSettingsTableMissing(err)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              'Table "platform_settings" does not exist yet. Run `pnpm db:migrate` on this database, then try again.',
          });
        }
        throw err;
      }
    }),

  /**
   * Idempotently inserts seeded marketing/system pages (`is_system`) when missing.
   * Core marketing Markdown slugs plus surface heroes (home/jobs/skills/trainings).
   */
  seedSystemPages: adminProcedure.mutation(async ({ ctx }) => {
    const res = await seedSystemPagesTables({
      actorUserId: ctx.session.user.id,
      actorLabel: ctx.session.user.email,
    });

    return { inserted: res.inserted };
  }),
});
