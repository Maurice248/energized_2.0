import Link from "next/link";
import type { Metadata } from "next";
import { and, arrayOverlaps, desc, eq, gte, ilike, or, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { employerOrgs, jobListings } from "@/server/db/schema";
import { Icon } from "@/components/shared/icon";
import { SiteHeader } from "@/components/marketing/site-header";
import {
  CERTIFICATION_OPTIONS,
  EXPERIENCE_LEVEL_LABELS,
  SECTOR_LABELS,
  WORK_SETUP_LABELS,
  formatSalary,
  type JobExperienceLevel,
  type JobSector,
  type JobWorkSetup,
} from "@/lib/jobs-options";
import { JobsSearchInput } from "./search-input";
import { SalarySlider } from "./salary-slider";
import { SavedSearchesPanel } from "@/components/jobs/saved-searches-panel";

const PAGE_SIZE = 12;

const SECTOR_VALUES: JobSector[] = [
  "oil_gas",
  "renewables",
  "nuclear",
  "utilities",
  "hydrogen",
  "power",
  "other",
];
const SETUP_VALUES: JobWorkSetup[] = [
  "onsite",
  "hybrid_preferred",
  "remote_ok",
  "flexible",
];
const LEVEL_VALUES: JobExperienceLevel[] = [
  "entry",
  "intermediate",
  "senior",
  "lead",
  "executive",
];
const SORT_VALUES = ["newest", "salary"] as const;
type SortValue = (typeof SORT_VALUES)[number];

const POSTED_VALUES = ["24h", "3d", "7d", "30d"] as const;
type PostedValue = (typeof POSTED_VALUES)[number];
const POSTED_LABELS: Record<PostedValue, string> = {
  "24h": "Last 24h",
  "3d": "Last 3 days",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
};
const POSTED_DAYS: Record<PostedValue, number> = {
  "24h": 1,
  "3d": 3,
  "7d": 7,
  "30d": 30,
};

const MIN_SALARY_FLOOR = 40000;
const MIN_SALARY_CEIL = 250000;

type Filters = {
  q: string | null;
  sector: JobSector | null;
  setup: JobWorkSetup | null;
  level: JobExperienceLevel | null;
  certs: string[];
  posted: PostedValue | null;
  loc: string | null;
  minSalary: number | null;
  sort: SortValue;
  page: number;
};

function parseFilters(
  searchParams: Record<string, string | string[] | undefined>,
): Filters {
  const first = (v: string | string[] | undefined): string | null =>
    Array.isArray(v) ? (v[0] ?? null) : (v ?? null);

  const rawQ = first(searchParams.q);
  const q = rawQ ? rawQ.trim().slice(0, 120) : null;

  const rawSector = first(searchParams.sector);
  const sector = SECTOR_VALUES.includes(rawSector as JobSector)
    ? (rawSector as JobSector)
    : null;

  const rawSetup = first(searchParams.setup);
  const setup = SETUP_VALUES.includes(rawSetup as JobWorkSetup)
    ? (rawSetup as JobWorkSetup)
    : null;

  const rawLevel = first(searchParams.level);
  const level = LEVEL_VALUES.includes(rawLevel as JobExperienceLevel)
    ? (rawLevel as JobExperienceLevel)
    : null;

  const rawCerts = first(searchParams.certs);
  const certs = rawCerts
    ? rawCerts
        .split(",")
        .map((c) => c.trim())
        .filter((c) => CERTIFICATION_OPTIONS.includes(c))
        .slice(0, 10)
    : [];

  const rawPosted = first(searchParams.posted);
  const posted: PostedValue | null = POSTED_VALUES.includes(
    rawPosted as PostedValue,
  )
    ? (rawPosted as PostedValue)
    : null;

  const rawLoc = first(searchParams.loc);
  const loc = rawLoc ? rawLoc.trim().slice(0, 120) : null;

  const rawMinSalary = parseInt(first(searchParams.minSalary) ?? "", 10);
  const minSalary = Number.isFinite(rawMinSalary)
    ? Math.min(MIN_SALARY_CEIL, Math.max(MIN_SALARY_FLOOR, rawMinSalary))
    : null;

  const rawSort = first(searchParams.sort);
  const sort: SortValue = SORT_VALUES.includes(rawSort as SortValue)
    ? (rawSort as SortValue)
    : "newest";

  const rawPage = parseInt(first(searchParams.page) ?? "1", 10);
  const page = Number.isFinite(rawPage)
    ? Math.min(500, Math.max(1, rawPage))
    : 1;

  return {
    q,
    sector,
    setup,
    level,
    certs,
    posted,
    loc,
    minSalary,
    sort,
    page,
  };
}

function hrefWith(filters: Filters, overrides: Partial<Filters>): string {
  const merged: Filters = { ...filters, ...overrides };
  const params = new URLSearchParams();
  if (merged.q) params.set("q", merged.q);
  if (merged.sector) params.set("sector", merged.sector);
  if (merged.setup) params.set("setup", merged.setup);
  if (merged.level) params.set("level", merged.level);
  if (merged.certs.length > 0) params.set("certs", merged.certs.join(","));
  if (merged.posted) params.set("posted", merged.posted);
  if (merged.loc) params.set("loc", merged.loc);
  if (merged.minSalary != null)
    params.set("minSalary", String(merged.minSalary));
  if (merged.sort !== "newest") params.set("sort", merged.sort);
  if (merged.page > 1) params.set("page", String(merged.page));
  const qs = params.toString();
  return qs ? `/jobs?${qs}` : "/jobs";
}

function hasAnyFilter(f: Filters): boolean {
  return Boolean(
    f.q ||
      f.sector ||
      f.setup ||
      f.level ||
      f.certs.length > 0 ||
      f.posted ||
      f.loc ||
      f.minSalary != null,
  );
}

function toggleCert(current: string[], cert: string): string[] {
  return current.includes(cert)
    ? current.filter((c) => c !== cert)
    : [...current, cert];
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const f = parseFilters(await searchParams);
  const parts: string[] = [];
  if (f.level) parts.push(EXPERIENCE_LEVEL_LABELS[f.level]);
  if (f.sector) parts.push(SECTOR_LABELS[f.sector]);
  else parts.push("Energy");
  const base = parts.join(" ");
  const title = hasAnyFilter(f) ? `${base} roles` : "Browse all roles";
  const description = hasAnyFilter(f)
    ? `Browse ${base.toLowerCase()} roles posted on Energized.`
    : "Find energy-sector roles across oil & gas, renewables, nuclear, utilities, hydrogen and power on Energized.";
  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
    alternates: { canonical: "/jobs" },
  };
}

export default async function JobsBrowsePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseFilters(await searchParams);

  const conditions = [eq(jobListings.status, "published")];
  if (filters.sector) conditions.push(eq(jobListings.sector, filters.sector));
  if (filters.setup) conditions.push(eq(jobListings.workSetup, filters.setup));
  if (filters.level)
    conditions.push(eq(jobListings.experienceLevel, filters.level));
  if (filters.q) {
    const needle = `%${filters.q.replace(/[%_]/g, (m) => `\\${m}`)}%`;
    conditions.push(
      or(
        ilike(jobListings.title, needle),
        ilike(jobListings.description, needle),
        ilike(employerOrgs.name, needle),
      )!,
    );
  }
  if (filters.loc) {
    const needle = `%${filters.loc.replace(/[%_]/g, (m) => `\\${m}`)}%`;
    conditions.push(ilike(jobListings.location, needle));
  }
  if (filters.certs.length > 0) {
    conditions.push(
      arrayOverlaps(jobListings.requiredCertifications, filters.certs),
    );
  }
  if (filters.posted) {
    // Server component: reading the wall clock per request is the point.
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    const cutoff = new Date(
      now - POSTED_DAYS[filters.posted] * 24 * 60 * 60 * 1000,
    );
    conditions.push(gte(jobListings.publishedAt, cutoff));
  }
  if (filters.minSalary != null) {
    // A role matches if EITHER salaryMax or salaryMin clears the floor.
    conditions.push(
      or(
        gte(jobListings.salaryMax, filters.minSalary),
        gte(jobListings.salaryMin, filters.minSalary),
      )!,
    );
  }

  const whereExpr = and(...conditions)!;

  const orderBy =
    filters.sort === "salary"
      ? [
          desc(jobListings.salaryMax),
          desc(jobListings.salaryMin),
          desc(jobListings.publishedAt),
        ]
      : [desc(jobListings.publishedAt)];

  const offset = (filters.page - 1) * PAGE_SIZE;

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: jobListings.id,
        title: jobListings.title,
        sector: jobListings.sector,
        subSectors: jobListings.subSectors,
        location: jobListings.location,
        workSetup: jobListings.workSetup,
        experienceLevel: jobListings.experienceLevel,
        salaryMin: jobListings.salaryMin,
        salaryMax: jobListings.salaryMax,
        salaryCurrency: jobListings.salaryCurrency,
        salaryPeriod: jobListings.salaryPeriod,
        requiredCertifications: jobListings.requiredCertifications,
        publishedAt: jobListings.publishedAt,
        orgId: employerOrgs.id,
        orgName: employerOrgs.name,
        orgLogoUrl: employerOrgs.logoUrl,
        orgLogoColor: employerOrgs.logoColor,
      })
      .from(jobListings)
      .innerJoin(employerOrgs, eq(employerOrgs.id, jobListings.orgId))
      .where(whereExpr)
      .orderBy(...orderBy)
      .limit(PAGE_SIZE)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(jobListings)
      .innerJoin(employerOrgs, eq(employerOrgs.id, jobListings.orgId))
      .where(whereExpr),
  ]);

  const total = totalRows[0]?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // Server component: reading the wall clock per request is the point.
  // eslint-disable-next-line react-hooks/purity
  const freshCutoff = Date.now() - 24 * 60 * 60 * 1000;

  return (
    <div
      className="v2"
      style={{ minHeight: "100vh", background: "var(--v2-ink-50)" }}
    >
      <SiteHeader active="jobs" />

      <div
        className="v2-container"
        style={{ paddingTop: 48, paddingBottom: 80 }}
      >
        <div style={{ marginBottom: 32 }}>
          <div className="v2-eyebrow">
            {total} open {total === 1 ? "role" : "roles"} · updated just now
          </div>
          <h1
            className="v2-h2"
            style={{
              fontStyle: "italic",
              fontWeight: 900,
              marginTop: 14,
              marginBottom: 20,
            }}
          >
            Find work that{" "}
            <em style={{ color: "var(--v2-accent-deep)" }}>actually</em> fits.
          </h1>
          <JobsSearchInput
            initialQ={filters.q ?? ""}
            initialLoc={filters.loc ?? ""}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "280px 1fr",
            gap: 32,
            alignItems: "start",
          }}
        >
          <aside
            style={{
              position: "sticky",
              top: 100,
              background: "white",
              border: "1px solid var(--v2-ink-200)",
              borderRadius: "var(--v2-r-xl)",
              padding: 22,
            }}
          >
            <FilterGroup title="Sector">
              <ChipLink
                href={hrefWith(filters, { sector: null, page: 1 })}
                active={!filters.sector}
              >
                All
              </ChipLink>
              {SECTOR_VALUES.map((s) => (
                <ChipLink
                  key={s}
                  href={hrefWith(filters, { sector: s, page: 1 })}
                  active={filters.sector === s}
                >
                  {SECTOR_LABELS[s]}
                </ChipLink>
              ))}
            </FilterGroup>

            <FilterGroup title="Level">
              <ChipLink
                href={hrefWith(filters, { level: null, page: 1 })}
                active={!filters.level}
              >
                All
              </ChipLink>
              {LEVEL_VALUES.map((l) => (
                <ChipLink
                  key={l}
                  href={hrefWith(filters, { level: l, page: 1 })}
                  active={filters.level === l}
                >
                  {EXPERIENCE_LEVEL_LABELS[l]}
                </ChipLink>
              ))}
            </FilterGroup>

            <FilterGroup title="Work arrangement">
              <ChipLink
                href={hrefWith(filters, { setup: null, page: 1 })}
                active={!filters.setup}
              >
                All
              </ChipLink>
              {SETUP_VALUES.map((s) => (
                <ChipLink
                  key={s}
                  href={hrefWith(filters, { setup: s, page: 1 })}
                  active={filters.setup === s}
                >
                  {WORK_SETUP_LABELS[s]}
                </ChipLink>
              ))}
            </FilterGroup>

            <FilterGroup
              title={`Min salary${
                filters.minSalary != null
                  ? ` · $${(filters.minSalary / 1000).toFixed(0)}k+`
                  : ""
              }`}
            >
              <div style={{ width: "100%" }}>
                <SalarySlider
                  initialValue={filters.minSalary}
                  floor={MIN_SALARY_FLOOR}
                  ceil={MIN_SALARY_CEIL}
                />
              </div>
            </FilterGroup>

            <FilterGroup title="Required tickets">
              {CERTIFICATION_OPTIONS.map((c) => (
                <ChipLink
                  key={c}
                  href={hrefWith(filters, {
                    certs: toggleCert(filters.certs, c),
                    page: 1,
                  })}
                  active={filters.certs.includes(c)}
                >
                  {c}
                </ChipLink>
              ))}
            </FilterGroup>

            <FilterGroup title="Posted within">
              <ChipLink
                href={hrefWith(filters, { posted: null, page: 1 })}
                active={!filters.posted}
              >
                Any
              </ChipLink>
              {POSTED_VALUES.map((p) => (
                <ChipLink
                  key={p}
                  href={hrefWith(filters, { posted: p, page: 1 })}
                  active={filters.posted === p}
                >
                  {POSTED_LABELS[p]}
                </ChipLink>
              ))}
            </FilterGroup>

            {hasAnyFilter(filters) && (
              <Link
                href="/jobs"
                className="v2-btn v2-btn-ghost v2-btn-sm"
                style={{ width: "100%", marginTop: 16 }}
              >
                Reset all
              </Link>
            )}
            <SavedSearchesPanel surface="jobs" />
          </aside>

          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 18,
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div
                style={{
                  fontFamily: "var(--v2-font-serif)",
                  fontSize: 32,
                  fontWeight: 900,
                }}
              >
                {total}
                <em
                  style={{
                    fontSize: 14,
                    marginLeft: 8,
                    color: "var(--v2-ink-500)",
                    fontWeight: 400,
                    fontStyle: "normal",
                    fontFamily: "var(--v2-font-sans)",
                  }}
                >
                  {total === 1 ? "result" : "results"}
                </em>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span
                  style={{
                    fontFamily: "var(--v2-font-mono)",
                    fontSize: 11,
                    color: "var(--v2-ink-500)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  Sort
                </span>
                <ChipLink
                  href={hrefWith(filters, { sort: "newest", page: 1 })}
                  active={filters.sort === "newest"}
                >
                  Newest
                </ChipLink>
                <ChipLink
                  href={hrefWith(filters, { sort: "salary", page: 1 })}
                  active={filters.sort === "salary"}
                >
                  Highest pay
                </ChipLink>
              </div>
            </div>

            {rows.length === 0 ? (
              <div
                style={{
                  padding: 64,
                  background: "white",
                  border: "1px solid var(--v2-ink-200)",
                  borderRadius: "var(--v2-r-xl)",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--v2-font-serif)",
                    fontSize: 28,
                    fontWeight: 900,
                    fontStyle: "italic",
                    marginBottom: 10,
                  }}
                >
                  No matches — yet.
                </div>
                <p style={{ color: "var(--v2-ink-500)", marginBottom: 20 }}>
                  Adjust your filters or browse all roles.
                </p>
                {hasAnyFilter(filters) && (
                  <Link
                    href="/jobs"
                    className="v2-btn v2-btn-primary v2-btn-sm"
                  >
                    Reset filters
                  </Link>
                )}
              </div>
            ) : (
              <div style={{ display: "grid", gap: 14 }}>
                {rows.map((r) => {
                  const isFresh =
                    r.publishedAt &&
                    new Date(r.publishedAt).getTime() > freshCutoff;
                  const postedLabel = r.publishedAt
                    ? new Date(r.publishedAt).toLocaleDateString("en-CA", {
                        month: "short",
                        day: "numeric",
                      })
                    : "Just posted";
                  return (
                    <Link
                      key={r.id}
                      href={`/jobs/${r.id}`}
                      style={{
                        display: "block",
                        padding: 22,
                        background: "white",
                        border: "1px solid var(--v2-ink-200)",
                        borderRadius: "var(--v2-r-xl)",
                        color: "inherit",
                        transition: "border-color .15s",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: 16,
                          alignItems: "flex-start",
                        }}
                      >
                        <div
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 12,
                            background: r.orgLogoColor,
                            color: "white",
                            display: "grid",
                            placeItems: "center",
                            fontFamily: "var(--v2-font-serif)",
                            fontSize: 18,
                            fontWeight: 900,
                            overflow: "hidden",
                            position: "relative",
                            flexShrink: 0,
                          }}
                        >
                          {r.orgLogoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={r.orgLogoUrl}
                              alt={r.orgName}
                              style={{
                                position: "absolute",
                                inset: 0,
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            r.orgName.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              display: "flex",
                              gap: 10,
                              alignItems: "center",
                              flexWrap: "wrap",
                              marginBottom: 4,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 17,
                                fontWeight: 700,
                                lineHeight: 1.3,
                              }}
                            >
                              {r.title ?? "Untitled role"}
                            </div>
                            {r.sector && (
                              <span className="v2-chip v2-chip-accent">
                                {SECTOR_LABELS[r.sector as JobSector]}
                              </span>
                            )}
                            {isFresh && (
                              <span className="v2-chip v2-chip-coral">
                                Fresh
                              </span>
                            )}
                          </div>
                          <div
                            style={{
                              fontSize: 13,
                              color: "var(--v2-ink-500)",
                              marginBottom: 12,
                            }}
                          >
                            {r.orgName}
                            {r.location && ` · ${r.location}`}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 14,
                              fontSize: 13,
                              color: "var(--v2-ink-600)",
                              marginBottom: 12,
                            }}
                          >
                            {r.workSetup && (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 6,
                                }}
                              >
                                <Icon name="briefcase" size={13} />{" "}
                                {WORK_SETUP_LABELS[r.workSetup as JobWorkSetup]}
                              </span>
                            )}
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                              }}
                            >
                              <Icon name="dollar" size={13} />{" "}
                              {formatSalary(
                                r.salaryMin,
                                r.salaryMax,
                                r.salaryCurrency,
                                r.salaryPeriod,
                              )}
                            </span>
                            {r.experienceLevel && (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 6,
                                }}
                              >
                                <Icon name="sparkles" size={13} />{" "}
                                {
                                  EXPERIENCE_LEVEL_LABELS[
                                    r.experienceLevel as JobExperienceLevel
                                  ]
                                }
                              </span>
                            )}
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                color: "var(--v2-ink-500)",
                              }}
                            >
                              <Icon name="check" size={13} /> Posted{" "}
                              {postedLabel}
                            </span>
                          </div>
                          {r.requiredCertifications.length > 0 && (
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 6,
                              }}
                            >
                              {r.requiredCertifications.slice(0, 3).map((c) => (
                                <span
                                  key={c}
                                  className="v2-chip v2-chip-outline"
                                >
                                  {c}
                                </span>
                              ))}
                              {r.requiredCertifications.length > 3 && (
                                <span
                                  className="v2-chip v2-chip-outline"
                                  style={{ color: "var(--v2-ink-500)" }}
                                >
                                  +{r.requiredCertifications.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div
                          style={{
                            flexShrink: 0,
                            display: "flex",
                            alignItems: "center",
                            color: "var(--v2-ink-500)",
                          }}
                        >
                          <Icon name="arrowUpRight" size={16} />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {totalPages > 1 && (
              <div
                style={{
                  marginTop: 32,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                {filters.page > 1 ? (
                  <Link
                    href={hrefWith(filters, { page: filters.page - 1 })}
                    className="v2-btn v2-btn-ghost v2-btn-sm"
                  >
                    ← Previous
                  </Link>
                ) : (
                  <span style={{ flex: 1 }} />
                )}
                <span
                  style={{
                    fontFamily: "var(--v2-font-mono)",
                    fontSize: 12,
                    color: "var(--v2-ink-500)",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  Page {filters.page} of {totalPages}
                </span>
                {filters.page < totalPages ? (
                  <Link
                    href={hrefWith(filters, { page: filters.page + 1 })}
                    className="v2-btn v2-btn-ghost v2-btn-sm"
                  >
                    Next →
                  </Link>
                ) : (
                  <span style={{ flex: 1 }} />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h4
        style={{
          fontFamily: "var(--v2-font-mono)",
          fontSize: 11,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--v2-ink-500)",
          marginBottom: 10,
          fontWeight: 700,
        }}
      >
        {title}
      </h4>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {children}
      </div>
    </div>
  );
}

function ChipLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`v2-filter-chip ${active ? "active" : ""}`}
      style={{ textDecoration: "none" }}
    >
      {children}
    </Link>
  );
}
