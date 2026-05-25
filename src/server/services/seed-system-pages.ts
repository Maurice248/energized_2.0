import { MARKETING_PAGE_FALLBACKS } from "@/lib/marketing-page-fallbacks";
import { normalizeStoredCmsBody } from "@/lib/cms-page-sections";
import { SYSTEM_SURFACE_PAGE_SEEDS } from "@/lib/surface-cms-seeds";
import { db } from "@/server/db";
import { auditLog, pages } from "@/server/db/schema";

export type SeedSystemPagesOptions = {
  actorUserId: string | null;
  actorLabel: string;
};

/**
 * Idempotently inserts seeded marketing/system pages (`is_system`) when missing.
 * Same rows as `admin.pages.seedSystemPages`.
 */
export async function seedSystemPagesTables(options: SeedSystemPagesOptions) {
  const marketingRows = MARKETING_PAGE_FALLBACKS.map((seed) => ({
    slug: seed.slug,
    title: seed.title,
    body: seed.body,
    bodyFormat: "markdown" as const,
    seoTitle: seed.seoTitle,
    seoDescription: seed.seoDescription,
    status: "draft" as const,
    isSystem: true,
    updatedByUserId: options.actorUserId,
  }));

  const surfaceRows = SYSTEM_SURFACE_PAGE_SEEDS.map((s) => ({
    slug: s.slug,
    title: s.title,
    body: normalizeStoredCmsBody(s.body, "html"),
    bodyFormat: "html" as const,
    seoTitle: s.seoTitle,
    seoDescription: s.seoDescription,
    status: "draft" as const,
    isSystem: true,
    updatedByUserId: options.actorUserId,
  }));

  const rows = [...marketingRows, ...surfaceRows];

  const inserted = await db
    .insert(pages)
    .values(rows)
    .onConflictDoNothing({ target: pages.slug })
    .returning({ id: pages.id, slug: pages.slug });

  if (inserted.length > 0) {
    await db.insert(auditLog).values({
      actorUserId: options.actorUserId,
      actorLabel: options.actorLabel,
      action: "page.seeded",
      entityType: "page",
      meta: { slugs: inserted.map((r) => r.slug) },
    });
  }

  return { inserted: inserted.length, slugs: inserted.map((r) => r.slug) };
}
