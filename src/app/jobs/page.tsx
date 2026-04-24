import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { employerOrgs, jobListings } from "@/server/db/schema";
import { getSession } from "@/server/auth";
import { Icon } from "@/components/shared/icon";
import {
  EXPERIENCE_LEVEL_LABELS,
  SECTOR_LABELS,
  WORK_SETUP_LABELS,
  formatSalary,
  type JobExperienceLevel,
  type JobSector,
  type JobWorkSetup,
} from "@/lib/jobs-options";
import { JobsSearchInput } from "./search-input";

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

type Filters = {
  q: string | null;
  sector: JobSector | null;
  setup: JobWorkSetup | null;
  level: JobExperienceLevel | null;
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

  const rawSort = first(searchParams.sort);
  const sort: SortValue = SORT_VALUES.includes(rawSort as SortValue)
    ? (rawSort as SortValue)
    : "newest";

  const rawPage = parseInt(first(searchParams.page) ?? "1", 10);
  const page = Number.isFinite(rawPage)
    ? Math.min(500, Math.max(1, rawPage))
    : 1;

  return { q, sector, setup, level, sort, page };
}

function hrefWith(filters: Filters, overrides: Partial<Filters>): string {
  const merged: Filters = { ...filters, ...overrides };
  const params = new URLSearchParams();
  if (merged.q) params.set("q", merged.q);
  if (merged.sector) params.set("sector", merged.sector);
  if (merged.setup) params.set("setup", merged.setup);
  if (merged.level) params.set("level", merged.level);
  if (merged.sort !== "newest") params.set("sort", merged.sort);
  if (merged.page > 1) params.set("page", String(merged.page));
  const qs = params.toString();
  return qs ? `/jobs?${qs}` : "/jobs";
}

function hasAnyFilter(f: Filters): boolean {
  return Boolean(f.q || f.sector || f.setup || f.level);
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
  const title = hasAnyFilter(f)
    ? `${base} roles on Energized`
    : "Energy jobs across Canada — Energized";
  const description = hasAnyFilter(f)
    ? `Browse ${base.toLowerCase()} roles posted on Energized.`
    : "Find energy-sector roles across oil & gas, renewables, nuclear, utilities, hydrogen and power on Energized.";
  return { title, description };
}

export default async function JobsBrowsePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseFilters(await searchParams);
  const session = await getSession();
  const viewerIsAuthed = Boolean(session);

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
      <header
        style={{
          padding: "20px 32px",
          background: "rgba(249,250,252,0.85)",
          backdropFilter: "saturate(180%) blur(14px)",
          WebkitBackdropFilter: "saturate(180%) blur(14px)",
          borderBottom: "1px solid var(--v2-ink-200)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 30,
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center" }}>
          <Image
            src="/energized-logo.svg"
            alt="Energized"
            width={144}
            height={80}
            priority
            style={{ height: 36, width: "auto" }}
          />
        </Link>
        <nav
          style={{
            display: "flex",
            gap: 20,
            alignItems: "center",
            fontSize: 14,
          }}
        >
          <Link
            href="/jobs"
            style={{ color: "var(--v2-ink-900)", fontWeight: 700 }}
          >
            Jobs
          </Link>
          {viewerIsAuthed ? (
            <Link href="/dashboard" className="v2-btn v2-btn-primary v2-btn-sm">
              Dashboard →
            </Link>
          ) : (
            <>
              <Link href="/sign-in" style={{ color: "var(--v2-ink-700)" }}>
                Sign in
              </Link>
              <Link href="/sign-up" className="v2-btn v2-btn-primary v2-btn-sm">
                Sign up
              </Link>
            </>
          )}
        </nav>
      </header>

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
          <JobsSearchInput initialQ={filters.q ?? ""} />
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

            {hasAnyFilter(filters) && (
              <Link
                href="/jobs"
                className="v2-btn v2-btn-ghost v2-btn-sm"
                style={{ width: "100%", marginTop: 16 }}
              >
                Reset all
              </Link>
            )}
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
