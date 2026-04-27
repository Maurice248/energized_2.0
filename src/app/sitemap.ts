import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { employerOrgs, jobListings } from "@/server/db/schema";
import { env } from "@/env";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1.0 },
    { url: `${base}/jobs`, changeFrequency: "daily", priority: 0.9 },
  ];

  const jobs = await db
    .select({
      id: jobListings.id,
      publishedAt: jobListings.publishedAt,
      updatedAt: jobListings.updatedAt,
    })
    .from(jobListings)
    .where(eq(jobListings.status, "published"));

  const orgs = await db
    .select({ id: employerOrgs.id, updatedAt: employerOrgs.updatedAt })
    .from(employerOrgs);

  return [
    ...staticRoutes,
    ...jobs.map((j) => ({
      url: `${base}/jobs/${j.id}`,
      lastModified: j.updatedAt ?? j.publishedAt ?? undefined,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...orgs.map((o) => ({
      url: `${base}/c/${o.id}`,
      lastModified: o.updatedAt ?? undefined,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
