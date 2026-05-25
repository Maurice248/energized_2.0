import type { inferRouterOutputs } from "@trpc/server";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import type { AppRouter } from "@/server/api/root";
import { api } from "@/lib/trpc/server";
import {
  EXPERIENCE_LEVEL_LABELS,
  SECTOR_LABELS,
  WORK_SETUP_LABELS,
  formatSalary,
  type JobExperienceLevel,
  type JobSector,
  type JobWorkSetup,
} from "@/lib/jobs-options";
import { cn } from "@/lib/utils";

export const metadata = { title: "Job postings · Admin · Energized" };

type JobRow = inferRouterOutputs<AppRouter>["admin"]["jobs"]["list"][number];

function formatDate(d: Date | null): string | null {
  if (!d) return null;
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(d));
}

function statusBadgeClass(status: JobRow["status"]): string {
  if (status === "published") return "v2-org-badge";
  if (status === "draft") return "v2-org-badge v2-org-badge-pending";
  return "v2-org-badge v2-org-badge-closed";
}

function statusLabel(status: JobRow["status"]): string {
  if (status === "published") return "Live";
  if (status === "draft") return "Draft";
  return "Closed";
}

function sectorLabel(sector: JobRow["sector"]): string | null {
  if (!sector) return null;
  return SECTOR_LABELS[sector as JobSector] ?? sector.replace(/_/g, " ");
}

function workSetupLabel(ws: JobRow["workSetup"]): string | null {
  if (!ws) return null;
  return WORK_SETUP_LABELS[ws as JobWorkSetup] ?? ws.replace(/_/g, " ");
}

function experienceLabel(level: JobRow["experienceLevel"]): string | null {
  if (!level) return null;
  return EXPERIENCE_LEVEL_LABELS[level as JobExperienceLevel] ?? level;
}

function DetailItem({
  label,
  children,
  fullWidth,
}: {
  label: string;
  children: React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div className={cn("v2-org-field", fullWidth && "v2-org-field-wide")}>
      <div className="v2-org-dl-label">{label}</div>
      <div className="v2-org-dl-val">{children}</div>
    </div>
  );
}

const DESCRIPTION_TRUNC = 560;

function JobPostingCard({ row }: { row: JobRow }) {
  const title =
    row.title?.trim() ||
    (row.status === "draft" ? "Untitled draft" : "Untitled role");

  const metaParts = [
    sectorLabel(row.sector),
    row.location?.trim() || null,
    experienceLabel(row.experienceLevel),
    formatSalary(
      row.salaryMin,
      row.salaryMax,
      row.salaryCurrency,
      row.salaryPeriod,
    ),
  ].filter(Boolean);

  const descriptionRaw = row.description?.trim() ?? "";
  const descriptionPreview =
    descriptionRaw.length > DESCRIPTION_TRUNC
      ? `${descriptionRaw.slice(0, DESCRIPTION_TRUNC)}…`
      : descriptionRaw;

  const creatorLine = [row.creatorName?.trim(), row.creatorEmail]
    .filter(Boolean)
    .join(" · ");

  return (
    <article
      className="v2-acard v2-org-card"
      aria-labelledby={`job-title-${row.id}`}
      id={`job-${row.id}`}
    >
      <header className="v2-org-card-head">
        <div style={{ minWidth: 0 }}>
          <h2 className="v2-org-co-name" id={`job-title-${row.id}`}>
            {title}
          </h2>
          <p className="v2-org-page-lead" style={{ marginTop: 6, marginBottom: 0 }}>
            <Link
              href={`/admin/organizations#org-${row.orgId}`}
              className="v2-acard-link"
            >
              {row.orgName}
            </Link>
            {row.orgVerified ? (
              <span className="v2-org-dl-label" style={{ marginLeft: 8 }}>
                Verified employer
              </span>
            ) : (
              <span className="v2-org-dl-label" style={{ marginLeft: 8 }}>
                Unverified org
              </span>
            )}
          </p>
          {metaParts.length > 0 ? (
            <p
              className="v2-org-dl-val"
              style={{ marginTop: 10, fontSize: 14, color: "var(--v2-ink-600)" }}
            >
              {metaParts.join(" · ")}
            </p>
          ) : null}
          {row.summary?.trim() ? (
            <p
              className="v2-org-about"
              style={{ marginTop: 12, fontSize: 14, color: "var(--v2-ink-600)" }}
            >
              {row.summary.trim()}
            </p>
          ) : null}
        </div>
        <div className="v2-org-card-badge-slot">
          <span className={statusBadgeClass(row.status)}>{statusLabel(row.status)}</span>
        </div>
      </header>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 18px", marginBottom: 14 }}>
        {row.status === "published" ? (
          <Link href={`/jobs/${row.id}`} className="v2-acard-link" target="_blank" rel="noreferrer">
            View public listing
          </Link>
        ) : null}
      </div>

      <details className="v2-org-details-disclosure">
        <summary className="v2-org-details-summary">
          <span className="v2-org-section-label" style={{ marginBottom: 0 }}>
            Posting details
          </span>
          <ChevronDown className="v2-org-details-chevron-icon" aria-hidden />
        </summary>
        <div className="v2-org-details-panel">
          <div className="v2-org-fields">
            <DetailItem label="Job ID">
              <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
                {row.id}
              </span>
            </DetailItem>
            <DetailItem label="Organization ID">
              <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
                {row.orgId}
              </span>
            </DetailItem>
            <DetailItem label="Work setup">{workSetupLabel(row.workSetup) ?? "—"}</DetailItem>
            <DetailItem label="Rotation">{row.rotationSchedule?.trim() || "—"}</DetailItem>
            <DetailItem label="Hours / week">
              {row.hoursPerWeek != null ? `${row.hoursPerWeek}` : "—"}
            </DetailItem>
            <DetailItem label="Published">{formatDate(row.publishedAt) ?? "—"}</DetailItem>
            <DetailItem label="Closed">{formatDate(row.closedAt) ?? "—"}</DetailItem>
            <DetailItem label="Created">{formatDate(row.createdAt) ?? "—"}</DetailItem>
            <DetailItem label="Updated">{formatDate(row.updatedAt) ?? "—"}</DetailItem>
            <DetailItem label="Created by">{creatorLine || "—"}</DetailItem>
            <DetailItem label="Screening questions">{row.screeningQuestions?.length ?? 0}</DetailItem>
            <DetailItem label="Required certs" fullWidth>
              {row.requiredCertifications?.length
                ? row.requiredCertifications.join(", ")
                : "—"}
            </DetailItem>
            <DetailItem label="Sub-sectors" fullWidth>
              {row.subSectors?.length ? row.subSectors.join(", ") : "—"}
            </DetailItem>
            {descriptionPreview ? (
              <DetailItem label="Description" fullWidth>
                <p className="v2-org-about">{descriptionPreview}</p>
              </DetailItem>
            ) : null}
          </div>
        </div>
      </details>
    </article>
  );
}

export default async function AdminJobsPage() {
  const jobs = await api.admin.jobs.list();

  const counts = jobs.reduce(
    (acc, j) => {
      acc.total += 1;
      acc[j.status] += 1;
      return acc;
    },
    { total: 0, draft: 0, published: 0, closed: 0 },
  );

  return (
    <div>
      <header className="v2-ahead" style={{ gridTemplateColumns: "1fr" }}>
        <div>
          <span className="v2-eyebrow">Listings</span>
          <h1>
            Every <em>job posting.</em>
          </h1>
          <p className="v2-ahead-sub" style={{ maxWidth: "none" }}>
            All drafts, live roles, and closed listings across employer tenants — newest updates
            first.
            {counts.total > 0 ? (
              <>
                {" "}
                <strong style={{ color: "var(--v2-ink-700)", fontWeight: 800 }}>
                  {counts.total}
                </strong>{" "}
                total ({counts.published} live, {counts.draft} draft
                {counts.closed > 0 ? `, ${counts.closed} closed` : ""}).
              </>
            ) : null}
          </p>
        </div>
      </header>

      {jobs.length === 0 ? (
        <div className="v2-tbl-empty">No job postings yet.</div>
      ) : (
        <div className="v2-org-grid">
          {jobs.map((row) => (
            <JobPostingCard key={row.id} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}
