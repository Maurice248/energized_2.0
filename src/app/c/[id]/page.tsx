import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { employerOrgs, jobListings } from "@/server/db/schema";
import { Icon } from "@/components/shared/icon";
import {
  SECTOR_LABELS as JOB_SECTOR_LABELS,
  WORK_SETUP_LABELS,
  formatSalary,
  type JobSector,
  type JobWorkSetup,
} from "@/lib/jobs-options";

export const metadata = { title: "Company — Energized" };

const COMPANY_SIZE_LABELS: Record<string, string> = {
  "1_10": "1–10",
  "11_50": "11–50",
  "51_120": "51–120",
  "120_250": "120–250",
  "250_500": "250–500",
  "500_1000": "500–1000",
  "1000_plus": "1000+",
};

const SECTOR_LABELS: Record<string, string> = {
  oil_gas: "Oil & Gas",
  renewables: "Renewable Energy",
  nuclear: "Nuclear",
  utilities: "Power Utilities",
  hydrogen: "Hydrogen",
  power: "Power",
  other: "Other",
};

export default async function PublicCompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [org] = await db
    .select({
      id: employerOrgs.id,
      name: employerOrgs.name,
      tagline: employerOrgs.tagline,
      about: employerOrgs.about,
      website: employerOrgs.website,
      hq: employerOrgs.hq,
      founded: employerOrgs.founded,
      logoUrl: employerOrgs.logoUrl,
      logoColor: employerOrgs.logoColor,
      coverUrl: employerOrgs.coverUrl,
      size: employerOrgs.size,
      primarySector: employerOrgs.primarySector,
      subSectors: employerOrgs.subSectors,
      verified: employerOrgs.verified,
    })
    .from(employerOrgs)
    .where(eq(employerOrgs.id, id))
    .limit(1);

  if (!org) notFound();

  const orgJobs = await db
    .select({
      id: jobListings.id,
      title: jobListings.title,
      sector: jobListings.sector,
      location: jobListings.location,
      workSetup: jobListings.workSetup,
      salaryMin: jobListings.salaryMin,
      salaryMax: jobListings.salaryMax,
      salaryCurrency: jobListings.salaryCurrency,
      salaryPeriod: jobListings.salaryPeriod,
      publishedAt: jobListings.publishedAt,
    })
    .from(jobListings)
    .where(
      and(
        eq(jobListings.orgId, org.id),
        eq(jobListings.status, "published"),
      ),
    )
    .orderBy(desc(jobListings.publishedAt));

  return (
    <div
      className="v2"
      style={{
        minHeight: "100vh",
        background: "var(--v2-ink-50, #F9FAFC)",
      }}
    >
      <header
        style={{
          padding: "20px 32px",
          background: "rgba(249,250,252,0.85)",
          backdropFilter: "saturate(180%) blur(14px)",
          borderBottom: "1px solid var(--v2-ink-200)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 30,
          gap: 24,
        }}
      >
        <Link href="/" style={{ display: "inline-block" }}>
          <Image
            src="/energized-logo.svg"
            alt="Energized"
            width={144}
            height={80}
            priority
            style={{ height: 40, width: "auto" }}
          />
        </Link>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Link className="v2-btn v2-btn-ghost v2-btn-sm" href="/sign-in">
            Sign in
          </Link>
          <Link className="v2-btn v2-btn-primary v2-btn-sm" href="/sign-up">
            Sign up
          </Link>
        </div>
      </header>

      <main
        style={{
          maxWidth: 960,
          margin: "0 auto",
          padding: "40px 32px 96px",
          display: "grid",
          gap: 24,
        }}
      >
        {/* Banner */}
        <div
          style={{
            position: "relative",
            height: 160,
            borderRadius: "var(--v2-r-xl)",
            background: org.coverUrl
              ? "#1D212C"
              : "linear-gradient(135deg, var(--v2-ink-950) 0%, #1D212C 60%, #2A303F 100%)",
            overflow: "hidden",
          }}
        >
          {org.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={org.coverUrl}
              alt=""
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "radial-gradient(500px circle at 80% 20%, rgba(199,249,86,0.18), transparent 55%), radial-gradient(400px circle at 15% 80%, rgba(124,199,255,0.1), transparent 55%)",
              }}
            />
          )}
        </div>

        {/* Identity */}
        <div
          style={{
            background: "white",
            border: "1px solid var(--v2-ink-200)",
            borderRadius: "var(--v2-r-xl)",
            padding: 32,
            display: "flex",
            gap: 24,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 20,
              background: org.logoColor,
              color: "white",
              display: "grid",
              placeItems: "center",
              fontFamily: "var(--v2-font-serif)",
              fontSize: 44,
              flexShrink: 0,
              overflow: "hidden",
            }}
          >
            {org.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={org.logoUrl}
                alt={org.name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <span>{org.name.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div
              style={{
                fontFamily: "var(--v2-font-serif)",
                fontSize: "clamp(28px, 3.4vw, 38px)",
                letterSpacing: "-0.02em",
                lineHeight: 1.05,
                fontWeight: 400,
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              {org.name}
              {org.verified && (
                <span className="ep-verified">
                  <Icon name="shield" size={11} /> Verified
                </span>
              )}
            </div>
            {org.tagline && (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 15,
                  color: "var(--v2-ink-600)",
                  fontFamily: "var(--v2-font-serif)",
                  fontStyle: "italic",
                }}
              >
                {org.tagline}
              </div>
            )}
            <div
              className="ep-identity-meta"
              style={{ marginTop: 12 }}
            >
              {org.hq && (
                <span>
                  <Icon name="mapPin" size={14} /> {org.hq}
                </span>
              )}
              {org.size && (
                <span>
                  <Icon name="users" size={14} />{" "}
                  {COMPANY_SIZE_LABELS[org.size]} employees
                </span>
              )}
              {org.primarySector && (
                <span>
                  <Icon name="building" size={14} />{" "}
                  {SECTOR_LABELS[org.primarySector]}
                </span>
              )}
              {org.founded && (
                <span>
                  <Icon name="clock" size={14} /> Founded {org.founded}
                </span>
              )}
              {org.website && (
                <a
                  href={org.website}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    color: "var(--v2-ink-900)",
                    textDecoration: "underline",
                    textUnderlineOffset: 2,
                  }}
                >
                  <Icon name="globe" size={14} />{" "}
                  {org.website.replace(/^https?:\/\//, "")}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* About */}
        {(org.about || org.subSectors.length > 0) && (
          <section className="pp-section">
            <div className="pp-section-head">
              <div>
                <div className="pp-section-title">About</div>
              </div>
            </div>
            {org.about && (
              <p
                style={{
                  margin: 0,
                  fontSize: 15,
                  lineHeight: 1.65,
                  color: "var(--v2-ink-700)",
                  whiteSpace: "pre-wrap",
                }}
              >
                {org.about}
              </p>
            )}
            {org.subSectors.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div
                  style={{
                    fontFamily: "var(--v2-font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--v2-ink-500)",
                    marginBottom: 10,
                  }}
                >
                  Sub-sectors
                </div>
                <div className="v2-filter-chips">
                  {org.subSectors.map((s) => (
                    <span key={s} className="v2-filter-chip active">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Open roles */}
        <section className="pp-section">
          <div className="pp-section-head">
            <div>
              <div className="pp-section-title">Open roles</div>
              <div className="pp-section-sub">
                {orgJobs.length === 0
                  ? "No published roles right now."
                  : `${orgJobs.length} open ${orgJobs.length === 1 ? "role" : "roles"} at ${org.name}`}
              </div>
            </div>
          </div>
          {orgJobs.length === 0 ? (
            <div
              style={{
                padding: 32,
                border: "1px dashed var(--v2-ink-200)",
                borderRadius: "var(--v2-r-lg)",
                textAlign: "center",
                color: "var(--v2-ink-500)",
              }}
            >
              <Icon name="briefcase" size={24} />
              <div
                style={{
                  marginTop: 10,
                  fontFamily: "var(--v2-font-serif)",
                  fontSize: 20,
                  color: "var(--v2-ink-900)",
                  fontWeight: 400,
                }}
              >
                No public roles yet
              </div>
              <div style={{ marginTop: 4, fontSize: 14 }}>
                Bookmark this page — new roles appear here as soon as
                {" "}{org.name} posts them.
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {orgJobs.map((j) => {
                const postedLabel = j.publishedAt
                  ? new Date(j.publishedAt).toLocaleDateString("en-CA", {
                      month: "short",
                      day: "numeric",
                    })
                  : null;
                return (
                  <Link
                    key={j.id}
                    href={`/jobs/${j.id}`}
                    style={{
                      display: "block",
                      padding: 18,
                      border: "1px solid var(--v2-ink-200)",
                      borderRadius: "var(--v2-r-lg)",
                      background: "white",
                      color: "inherit",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        flexWrap: "wrap",
                        marginBottom: 6,
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 16 }}>
                        {j.title ?? "Untitled role"}
                      </div>
                      {j.sector && (
                        <span className="v2-chip v2-chip-accent">
                          {JOB_SECTOR_LABELS[j.sector as JobSector]}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "var(--v2-ink-600)",
                      }}
                    >
                      {j.location ?? "Location TBD"}
                      {j.workSetup &&
                        ` · ${WORK_SETUP_LABELS[j.workSetup as JobWorkSetup]}`}
                      {` · ${formatSalary(j.salaryMin, j.salaryMax, j.salaryCurrency, j.salaryPeriod)}`}
                      {postedLabel && ` · Posted ${postedLabel}`}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
