import { logger, schedules } from "@trigger.dev/sdk/v3";
import { and, eq, gte, ilike, or, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  employerOrgs,
  jobListings,
  savedSearches,
  user,
} from "@/server/db/schema";
import { resend } from "@/lib/resend";
import { env } from "@/env";
import SavedSearchDigestEmail, {
  type DigestJob,
} from "@/emails/saved-search-digest";
import { SECTOR_LABELS } from "@/lib/jobs-options";

type SectorValue = keyof typeof SECTOR_LABELS;

const ALLOWED_SECTORS: readonly SectorValue[] = [
  "oil_gas",
  "renewables",
  "nuclear",
  "utilities",
  "hydrogen",
  "power",
  "other",
];

// Daily digest cron — runs at 12:00 UTC (~ 7am Eastern). For each saved
// /jobs search, find roles published in the last 24 hours that match a
// minimum subset of the saved filters (sector + free-text q + location +
// experience level). If anything matches, send the user a digest email.
export const sendSavedSearchDigest = schedules.task({
  id: "send-saved-search-digest",
  cron: "0 12 * * *",
  maxDuration: 600,
  run: async () => {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const searches = await db
      .select({
        id: savedSearches.id,
        userId: savedSearches.userId,
        name: savedSearches.name,
        queryString: savedSearches.queryString,
        userName: user.name,
        userEmail: user.email,
      })
      .from(savedSearches)
      .innerJoin(user, eq(user.id, savedSearches.userId))
      .where(eq(savedSearches.surface, "jobs"));

    let sent = 0;
    for (const s of searches) {
      const params = new URLSearchParams(s.queryString);
      const q = params.get("q")?.trim() ?? "";
      const sectorParam = params.get("sector");
      const sector =
        sectorParam &&
        (ALLOWED_SECTORS as readonly string[]).includes(sectorParam)
          ? (sectorParam as SectorValue)
          : null;
      const loc = params.get("loc")?.trim() ?? "";
      const level = params.get("level")?.trim() ?? "";

      const conditions = [
        eq(jobListings.status, "published"),
        gte(jobListings.publishedAt, cutoff),
      ];
      if (sector) conditions.push(eq(jobListings.sector, sector));
      if (level)
        conditions.push(
          sql`${jobListings.experienceLevel}::text = ${level}`,
        );
      if (loc) conditions.push(ilike(jobListings.location, `%${loc}%`));
      if (q) {
        const term = `%${q}%`;
        const qFilter = or(
          ilike(jobListings.title, term),
          ilike(jobListings.description, term),
        );
        if (qFilter) conditions.push(qFilter);
      }

      const matches = await db
        .select({
          id: jobListings.id,
          title: jobListings.title,
          location: jobListings.location,
          sector: jobListings.sector,
          companyName: employerOrgs.name,
        })
        .from(jobListings)
        .innerJoin(
          employerOrgs,
          eq(employerOrgs.id, jobListings.orgId),
        )
        .where(and(...conditions))
        .limit(8);

      if (matches.length === 0) continue;

      const jobs: DigestJob[] = matches.map((m) => ({
        id: m.id,
        title: m.title ?? "Untitled role",
        companyName: m.companyName ?? "Unknown",
        location: m.location,
        sectorLabel: m.sector ? (SECTOR_LABELS[m.sector] ?? null) : null,
      }));

      const searchHref = s.queryString
        ? `${env.NEXT_PUBLIC_APP_URL}/jobs?${s.queryString}`
        : `${env.NEXT_PUBLIC_APP_URL}/jobs`;

      try {
        const result = await resend.emails.send({
          from: env.EMAIL_FROM,
          to: s.userEmail,
          subject: `${matches.length} new ${matches.length === 1 ? "role" : "roles"} for "${s.name}"`,
          react: SavedSearchDigestEmail({
            recipientName: s.userName ?? null,
            searchName: s.name,
            searchHref,
            jobs,
            appUrl: env.NEXT_PUBLIC_APP_URL,
          }),
        });
        if (result.error) {
          logger.warn("digest send failed", {
            searchId: s.id,
            reason: String(result.error),
          });
        } else {
          sent += 1;
        }
      } catch (e) {
        logger.warn("digest send threw", {
          searchId: s.id,
          reason: String(e),
        });
      }
    }

    return { sent };
  },
});
