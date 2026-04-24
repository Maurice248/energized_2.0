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

type PreviewJob = {
  title: string | null;
  sector: JobSector | null;
  experienceLevel: JobExperienceLevel | null;
  location: string | null;
  workSetup: JobWorkSetup | null;
  rotationSchedule: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: string | null;
  requiredCertifications: string[];
  summary: string | null;
  description: string | null;
};

export function JobPreviewCard({ job }: { job: PreviewJob }) {
  return (
    <article
      className="v2"
      style={{
        border: "1px solid var(--v2-ink-200)",
        borderRadius: "var(--v2-r-xl)",
        padding: 28,
        background: "white",
      }}
    >
      <div className="v2-eyebrow" style={{ marginBottom: 10 }}>
        {job.sector ? SECTOR_LABELS[job.sector] : "Sector —"} ·{" "}
        {job.experienceLevel
          ? EXPERIENCE_LEVEL_LABELS[job.experienceLevel]
          : "Level —"}
      </div>
      <h2
        className="v2-h3"
        style={{ fontStyle: "italic", fontWeight: 900, marginBottom: 8 }}
      >
        {job.title || "Untitled role"}
      </h2>
      {job.summary && (
        <p style={{ color: "var(--v2-ink-600)", marginBottom: 16 }}>
          {job.summary}
        </p>
      )}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: 20,
        }}
      >
        {job.location && (
          <span className="v2-chip">
            <Icon name="mapPin" size={12} /> {job.location}
          </span>
        )}
        {job.workSetup && (
          <span className="v2-chip">{WORK_SETUP_LABELS[job.workSetup]}</span>
        )}
        {job.rotationSchedule && (
          <span className="v2-chip">Rotation {job.rotationSchedule}</span>
        )}
        <span className="v2-chip v2-chip-accent">
          {formatSalary(
            job.salaryMin,
            job.salaryMax,
            job.salaryCurrency,
            job.salaryPeriod,
          )}
        </span>
      </div>
      {job.requiredCertifications.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontFamily: "var(--v2-font-mono)",
              fontSize: 11,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--v2-ink-500)",
              marginBottom: 8,
            }}
          >
            Required tickets
          </div>
          <div className="v2-filter-chips">
            {job.requiredCertifications.map((c) => (
              <span key={c} className="v2-filter-chip active">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}
      <div
        style={{
          whiteSpace: "pre-wrap",
          lineHeight: 1.65,
          color: "var(--v2-ink-700)",
        }}
      >
        {job.description || "Add a description to bring this role to life."}
      </div>
    </article>
  );
}
