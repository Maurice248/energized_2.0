import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { pages } from "@/server/db/schema";
import {
  SiteHeader,
  type SiteHeaderActive,
} from "@/components/marketing/site-header";
import { CmsPageBody } from "@/components/marketing/cms-page-body";
import {
  getMarketingFallback,
  type MarketingPageFallback,
} from "@/lib/marketing-page-fallbacks";

type Slug = MarketingPageFallback["slug"];

const NAV_ACTIVE_BY_SLUG: Partial<Record<Slug, SiteHeaderActive>> = {
  about: "about",
  "for-seekers": "seekers",
  "for-employers": "employers",
  contact: "contact",
};

async function loadPublishedRow(slug: Slug) {
  const [row] = await db
    .select({
      title: pages.title,
      body: pages.body,
      bodyFormat: pages.bodyFormat,
      seoTitle: pages.seoTitle,
      seoDescription: pages.seoDescription,
    })
    .from(pages)
    .where(and(eq(pages.slug, slug), eq(pages.status, "published")))
    .limit(1);
  return row ?? null;
}

/** Published CMS row merged onto seeded fallbacks. Used by hybrid routes (e.g. /contact). */
export async function loadMarketingPage(slug: Slug) {
  const fallback = getMarketingFallback(slug);
  const row = await loadPublishedRow(slug);
  return {
    eyebrow: fallback.eyebrow,
    title: row?.title ?? fallback.title,
    body: row?.body ?? fallback.body,
    bodyFormat: row?.bodyFormat ?? ("markdown" as const),
  };
}

/**
 * Server-side helper used by each marketing route's `generateMetadata` to
 * compute SEO metadata from the CMS row (or fall back to the seeded defaults).
 */
export async function buildMarketingMetadata(slug: Slug): Promise<Metadata> {
  const fallback = getMarketingFallback(slug);
  const row = await loadPublishedRow(slug);
  return {
    title: row?.seoTitle ?? fallback.seoTitle,
    description: row?.seoDescription ?? fallback.seoDescription,
    alternates: { canonical: `/${slug}` },
  };
}

/**
 * Renders a CMS-backed marketing page with the same chrome the legacy static
 * pages used: `<SiteHeader />` + the `v2-container` shell, the page's eyebrow,
 * the headline, and the markdown body. If a published CMS row exists for this
 * slug, its title and body replace the fallback content.
 */
export async function CmsMarketingPage({ slug }: { slug: Slug }) {
  const fallback = getMarketingFallback(slug);
  const row = await loadPublishedRow(slug);

  const title = row?.title ?? fallback.title;
  const body = row?.body ?? fallback.body;
  const bodyFormat = row?.bodyFormat ?? "markdown";

  return (
    <>
      <SiteHeader active={NAV_ACTIVE_BY_SLUG[slug]} />
      <main
        className="v2-container"
        style={{ padding: "80px 0 120px", flex: 1 }}
      >
        <div className="v2-eyebrow">{fallback.eyebrow}</div>
        <h1 className="v2-display" style={{ marginTop: 16 }}>
          {title}
        </h1>
        <CmsPageBody body={body} bodyFormat={bodyFormat} />
      </main>
    </>
  );
}
