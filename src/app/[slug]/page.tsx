import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { pages } from "@/server/db/schema";
import { SiteHeader } from "@/components/marketing/site-header";
import { CmsPageBody } from "@/components/marketing/cms-page-body";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

async function loadPublishedPage(slug: string) {
  if (!slug || slug.length > 80) return null;
  const [row] = await db
    .select({
      slug: pages.slug,
      title: pages.title,
      body: pages.body,
      bodyFormat: pages.bodyFormat,
      seoTitle: pages.seoTitle,
      seoDescription: pages.seoDescription,
      updatedAt: pages.updatedAt,
    })
    .from(pages)
    .where(and(eq(pages.slug, slug), eq(pages.status, "published")))
    .limit(1);
  return row ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await loadPublishedPage(slug);
  if (!page) return { title: "Not found" };
  return {
    title: page.seoTitle ?? page.title,
    description: page.seoDescription ?? undefined,
    alternates: { canonical: `/${page.slug}` },
  };
}

export default async function CmsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await loadPublishedPage(slug);
  if (!page) notFound();

  return (
    <>
      <SiteHeader />
      <main
        className="v2-container"
        style={{ padding: "80px 0 120px", flex: 1 }}
      >
        <h1 className="v2-display" style={{ marginTop: 16 }}>
          {page.title}
        </h1>
        <CmsPageBody body={page.body} bodyFormat={page.bodyFormat} />
      </main>
    </>
  );
}
