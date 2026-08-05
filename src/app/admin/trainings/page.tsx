import type { inferRouterOutputs } from "@trpc/server";
import { ChevronDown, ListTree, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import type { AppRouter } from "@/server/api/root";
import { api } from "@/lib/trpc/server";
import type { TrainingUnlock } from "@/server/db/schema";
import { cn } from "@/lib/utils";

export const metadata = { title: "Trainings · Admin · Energized" };

type TrainingRow = inferRouterOutputs<AppRouter>["admin"]["trainings"]["list"][number];

const SECTOR_LABEL: Record<string, string> = {
  safety: "Safety",
  tech: "Technical",
  prof: "Professional",
  soft: "Soft skills",
  trans: "Transitions",
};

const LEVEL_LABEL: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  all: "All levels",
};

function formatDate(d: Date | null): string | null {
  if (!d) return null;
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(d));
}

function catalogBadgeClass(row: TrainingRow): string {
  if (row.isActive) return "v2-org-badge";
  return "v2-org-badge v2-org-badge-closed";
}

function catalogBadgeLabel(row: TrainingRow): string {
  return row.isActive ? "Live in catalog" : "Hidden";
}

function sectorLabel(sector: TrainingRow["sector"]): string {
  return SECTOR_LABEL[sector] ?? sector;
}

function levelLabel(level: TrainingRow["level"]): string {
  return LEVEL_LABEL[level] ?? level;
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

const LONG_TRUNC = 520;

function unlocksSummary(unlocks: TrainingUnlock[]): string {
  if (!unlocks.length) return "—";
  return unlocks
    .map((u) => [u.role, u.co, u.band].filter(Boolean).join(" · "))
    .join("; ");
}

function TrainingProgramCard({ row }: { row: TrainingRow }) {
  const longRaw = row.longBlurb?.trim() ?? "";
  const longPreview =
    longRaw.length > LONG_TRUNC ? `${longRaw.slice(0, LONG_TRUNC)}…` : longRaw;

  const metaParts = [
    sectorLabel(row.sector),
    levelLabel(row.level),
    row.durationLabel,
    `${row.hours}h`,
    row.certName?.trim() || null,
  ].filter(Boolean);

  const tags = [
    row.isFeatured ? "Featured" : null,
    row.isNew ? "New" : null,
  ].filter(Boolean);

  return (
    <article
      className="v2-acard v2-org-card"
      aria-labelledby={`training-title-${row.id}`}
      id={`training-${row.id}`}
    >
      <header className="v2-org-card-head">
        <div className="flex min-w-0 flex-1 gap-4">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-base font-black text-white shadow-inner"
            style={{ background: row.tileColor }}
            aria-hidden
          >
            {row.monogram}
          </div>
          <div style={{ minWidth: 0 }}>
            <h2 className="v2-org-co-name" id={`training-title-${row.id}`}>
              {row.title}
            </h2>
            <p className="v2-org-page-lead" style={{ marginTop: 6, marginBottom: 0 }}>
              <span className="v2-org-dl-val" style={{ fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
                {row.slug}
              </span>
            </p>
            {metaParts.length > 0 ? (
              <p
                className="v2-org-dl-val"
                style={{ marginTop: 10, fontSize: 14, color: "var(--v2-ink-600)" }}
              >
                {metaParts.join(" · ")}
              </p>
            ) : null}
            {tags.length > 0 ? (
              <p
                className="v2-org-dl-val"
                style={{ marginTop: 8, fontSize: 13, color: "var(--v2-ink-500)" }}
              >
                {tags.join(" · ")}
              </p>
            ) : null}
            {row.shortBlurb?.trim() ? (
              <p
                className="v2-org-about"
                style={{ marginTop: 12, fontSize: 14, color: "var(--v2-ink-600)" }}
              >
                {row.shortBlurb.trim()}
              </p>
            ) : null}
          </div>
        </div>
        <div className="v2-org-card-badge-slot">
          <span className={catalogBadgeClass(row)}>{catalogBadgeLabel(row)}</span>
        </div>
      </header>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 18px", marginBottom: 14 }}>
        <Link
          href={`/admin/trainings/${row.id}/edit`}
          className="v2-acard-link inline-flex items-center gap-1"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden />
          Edit program
        </Link>
        <Link
          href={`/admin/trainings/${row.id}/curriculum`}
          className="v2-acard-link inline-flex items-center gap-1"
        >
          <ListTree className="h-3.5 w-3.5" aria-hidden />
          Manage curriculum
        </Link>
        <Link href={`/trainings/${row.slug}`} className="v2-acard-link" target="_blank" rel="noreferrer">
          View learner catalog page
        </Link>
      </div>

      <details className="v2-org-details-disclosure">
        <summary className="v2-org-details-summary">
          <span className="v2-org-section-label" style={{ marginBottom: 0 }}>
            Program details
          </span>
          <ChevronDown className="v2-org-details-chevron-icon" aria-hidden />
        </summary>
        <div className="v2-org-details-panel">
          <div className="v2-org-fields">
            <DetailItem label="Training ID">
              <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 13 }}>{row.id}</span>
            </DetailItem>
            <DetailItem label="Sort order">{row.sortOrder}</DetailItem>
            <DetailItem label="Featured">{row.isFeatured ? "Yes" : "No"}</DetailItem>
            <DetailItem label="New badge">{row.isNew ? "Yes" : "No"}</DetailItem>
            <DetailItem label="Modules">{row.moduleCount}</DetailItem>
            <DetailItem label="Lessons">{row.lessonCount}</DetailItem>
            <DetailItem label="Enrollments">{row.enrollmentCount}</DetailItem>
            <DetailItem label="Created">{formatDate(row.createdAt) ?? "—"}</DetailItem>
            <DetailItem label="Instructor">{row.instructorName}</DetailItem>
            <DetailItem label="Instructor role" fullWidth>
              {row.instructorRole?.trim() || "—"}
            </DetailItem>
            <DetailItem label="Certificate name" fullWidth>
              {row.certName?.trim() || "—"}
            </DetailItem>
            <DetailItem label="Learning outcomes" fullWidth>
              {row.outcomesJson?.length ? (
                <ul className="v2-org-about" style={{ margin: 0, paddingLeft: 18 }}>
                  {row.outcomesJson.map((o, i) => (
                    <li key={`${row.id}-out-${i}`}>{o}</li>
                  ))}
                </ul>
              ) : (
                "—"
              )}
            </DetailItem>
            <DetailItem label="Unlock tiers (paywall hints)" fullWidth>
              {unlocksSummary(row.unlocksJson)}
            </DetailItem>
            {longPreview ? (
              <DetailItem label="Long description" fullWidth>
                <p className="v2-org-about">{longPreview}</p>
              </DetailItem>
            ) : null}
          </div>
        </div>
      </details>
    </article>
  );
}

export default async function AdminTrainingsPage() {
  const programs = await api.admin.trainings.list();

  const counts = programs.reduce(
    (acc, p) => {
      acc.total += 1;
      if (p.isActive) acc.live += 1;
      else acc.hidden += 1;
      if (p.isFeatured) acc.featured += 1;
      if (p.isNew) acc.newFlag += 1;
      acc.modules += p.moduleCount;
      acc.lessons += p.lessonCount;
      acc.enrollments += p.enrollmentCount;
      return acc;
    },
    {
      total: 0,
      live: 0,
      hidden: 0,
      featured: 0,
      newFlag: 0,
      modules: 0,
      lessons: 0,
      enrollments: 0,
    },
  );

  return (
    <div>
      <header
        className="v2-ahead"
        style={{ gridTemplateColumns: "minmax(0, 1fr) auto", alignItems: "start", gap: 24 }}
      >
        <div>
          <span className="v2-eyebrow">Workforce</span>
          <h1>
            Every <em>training program.</em>
          </h1>
          <p className="v2-ahead-sub" style={{ maxWidth: "none" }}>
            All programs defined in the platform — including items hidden from the public catalog —
            with module counts, lesson inventory, and enrollment volume.
            {counts.total > 0 ? (
              <>
                {" "}
                <strong style={{ color: "var(--v2-ink-700)", fontWeight: 800 }}>
                  {counts.total}
                </strong>{" "}
                programs ({counts.live} live
                {counts.hidden > 0 ? `, ${counts.hidden} hidden` : ""}
                {counts.featured > 0 ? ` · ${counts.featured} featured` : ""}
                {counts.newFlag > 0 ? ` · ${counts.newFlag} marked new` : ""}). Curriculum:{" "}
                <strong style={{ color: "var(--v2-ink-700)", fontWeight: 800 }}>
                  {counts.modules}
                </strong>{" "}
                modules,{" "}
                <strong style={{ color: "var(--v2-ink-700)", fontWeight: 800 }}>
                  {counts.lessons}
                </strong>{" "}
                lessons —{" "}
                <strong style={{ color: "var(--v2-ink-700)", fontWeight: 800 }}>
                  {counts.enrollments}
                </strong>{" "}
                enrollments total.
              </>
            ) : null}
          </p>
        </div>
        <div style={{ alignSelf: "start" }}>
          <Link
            href="/admin/trainings/new"
            className="v2-btn v2-btn-primary inline-flex items-center gap-1.5 shrink-0"
          >
            <Plus className="h-4 w-4" aria-hidden />
            New training
          </Link>
        </div>
      </header>

      {programs.length === 0 ? (
        <div className="v2-tbl-empty">
          No training programs in the database yet.{" "}
          <Link
            href="/admin/trainings/new"
            className="font-semibold text-[var(--v2-accent-deep)] underline-offset-2 hover:underline"
          >
            Create the first one
          </Link>
          .
        </div>
      ) : (
        <div className="v2-org-grid">
          {programs.map((row) => (
            <TrainingProgramCard key={row.id} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}
