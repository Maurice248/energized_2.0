import { logger, schedules } from "@trigger.dev/sdk/v3";
import { and, arrayOverlaps, eq, gte, ilike, or, sql } from "drizzle-orm";
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
import {
  CERTIFICATION_OPTIONS,
  EXPERIENCE_LEVEL_LABELS,
  SECTOR_LABELS,
  WORK_SETUP_LABELS,
  type JobExperienceLevel,
  type JobWorkSetup,
} from "@/lib/jobs-options";

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

const ALLOWED_SETUPS = Object.keys(WORK_SETUP_LABELS) as JobWorkSetup[];
const ALLOWED_LEVELS = Object.keys(
  EXPERIENCE_LEVEL_LABELS,
) as JobExperienceLevel[];

// Reasonable upper bound for a yearly minimum-salary filter (CAD).
// Any value outside [0, 10_000_000] is treated as garbage and skipped.
const MIN_SALARY_CEIL = 10_000_000;

// Daily digest cron — runs at 12:00 UTC (~ 7am Eastern). For each saved
// /jobs search, find roles published in the last 24 hours that match the
// saved filters (q, sector, level, setup, loc, certs, minSalary). The
// `posted` filter is intentionally ignored — the digest is always a
// fixed 24-hour window, so a stricter `posted` would silently zero
// results and a looser one would be a no-op. If anything matches, send
// the user a digest email.
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
      const levelParam = params.get("level")?.trim() ?? "";
      const level =
        levelParam &&
        (ALLOWED_LEVELS as readonly string[]).includes(levelParam)
          ? (levelParam as JobExperienceLevel)
          : null;
      const setupParam = params.get("setup")?.trim() ?? "";
      const setup =
        setupParam &&
        (ALLOWED_SETUPS as readonly string[]).includes(setupParam)
          ? (setupParam as JobWorkSetup)
          : null;
      const certs = (params.get("certs") ?? "")
        .split(",")
        .map((c) => c.trim())
        .filter((c) => c.length > 0 && CERTIFICATION_OPTIONS.includes(c))
        .slice(0, 10);
      const minSalaryRaw = parseInt(params.get("minSalary") ?? "", 10);
      const minSalary =
        Number.isFinite(minSalaryRaw) &&
        minSalaryRaw > 0 &&
        minSalaryRaw <= MIN_SALARY_CEIL
          ? minSalaryRaw
          : null;

      const conditions = [
        eq(jobListings.status, "published"),
        gte(jobListings.publishedAt, cutoff),
      ];
      if (sector) conditions.push(eq(jobListings.sector, sector));
      if (level)
        conditions.push(
          sql`${jobListings.experienceLevel}::text = ${level}`,
        );
      if (setup) conditions.push(eq(jobListings.workSetup, setup));
      if (loc) conditions.push(ilike(jobListings.location, `%${loc}%`));
      if (certs.length > 0) {
        conditions.push(
          arrayOverlaps(jobListings.requiredCertifications, certs),
        );
      }
      if (minSalary != null) {
        const salaryFilter = or(
          gte(jobListings.salaryMax, minSalary),
          gte(jobListings.salaryMin, minSalary),
        );
        if (salaryFilter) conditions.push(salaryFilter);
      }
      if (q) {
        const term = `%${q.replace(/[%_]/g, (m) => `\\${m}`)}%`;
        const qFilter = or(
          ilike(jobListings.title, term),
          ilike(jobListings.description, term),
          ilike(employerOrgs.name, term),
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
