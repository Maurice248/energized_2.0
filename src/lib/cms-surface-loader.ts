import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { pages } from "@/server/db/schema";
import { parseCmsSectionsFromBody } from "@/lib/cms-page-sections";
import type { SurfaceCmsSlug } from "@/lib/surface-cms-seeds";

export async function getPublishedSurfaceSectionHtml(
  slug: SurfaceCmsSlug,
  sectionId: string,
): Promise<string | null> {
  const [row] = await db
    .select({
      body: pages.body,
      bodyFormat: pages.bodyFormat,
      title: pages.title,
    })
    .from(pages)
    .where(and(eq(pages.slug, slug), eq(pages.status, "published")))
    .limit(1);

  if (!row) return null;

  const sections = parseCmsSectionsFromBody(
    row.body,
    row.bodyFormat,
    row.title,
  );
  const hit = sections.find((s) => s.id === sectionId);
  const trimmed = hit?.content?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}
