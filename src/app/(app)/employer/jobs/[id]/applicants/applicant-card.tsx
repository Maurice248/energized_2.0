"use client";

import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/shared/icon";
import { api } from "@/lib/trpc/client";
import { SkillBadgePill } from "@/components/applicants/skill-badge-pill";

export type ApplicationStatus =
  | "submitted"
  | "reviewed"
  | "interview"
  | "offer"
  | "rejected";

export type ApplicantRow = {
  id: string;
  coverNote: string | null;
  screeningAnswers: { q: string; a: string; required: boolean }[];
  status: ApplicationStatus;
  createdAt: Date;
  candidateId: string;
  candidateName: string | null;
  candidateImage: string | null;
  headline: string | null;
  location: string | null;
  yearsExperience: number | null;
  /** Cached AI fit score, null when not scored yet. */
  fitScore: number | null;
  /** The energy sector of the job being applied to, for badge filtering. */
  jobSector: string | null;
};

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  submitted: "Submitted",
  reviewed: "Reviewed",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
};

export function statusChipClass(status: ApplicationStatus): string {
  if (status === "offer") return "v2-chip v2-chip-accent";
  if (status === "rejected") return "v2-chip v2-chip-coral";
  return "v2-chip v2-chip-outline";
}

function InterviewBadge({ applicationId }: { applicationId: string }) {
  const list = api.interviews.list.useQuery({ applicationId });
  const latest = list.data?.[0];
  if (!latest) return null;

  if (latest.status === "proposed") {
    const days = Math.max(
      0,
      Math.ceil((new Date(latest.expiresAt).getTime() - Date.now()) / 86_400_000),
    );
    return (
      <span style={{ fontSize: 11, color: "var(--v2-ink-500)" }}>
        Awaiting candidate · {days}d
      </span>
    );
  }

  if (latest.status === "confirmed") {
    const slot = latest.slots.find((s) => s.isConfirmed);
    if (!slot) return null;
    const fmt = new Date(slot.startsAt).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    return (
      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--v2-accent-deep)" }}>
        Confirmed · {fmt}
      </span>
    );
  }

  if (latest.status === "expired") {
    return <span style={{ fontSize: 11, color: "var(--v2-coral)" }}>Expired</span>;
  }

  // canceled / completed → no badge
  return null;
}

export function ApplicantCard({
  applicant,
  jobId,
  applicationStatus,
  canEdit,
  onMove,
  pending,
}: {
  applicant: ApplicantRow;
  jobId: string;
  applicationStatus: ApplicationStatus;
  canEdit: boolean;
  onMove: (id: string, status: ApplicationStatus) => void;
  pending: boolean;
}) {
  const initials = (applicant.candidateName ?? "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const appliedLabel = new Date(applicant.createdAt).toLocaleDateString(
    "en-CA",
    { month: "short", day: "numeric" },
  );
  const otherStatuses = (Object.keys(STATUS_LABELS) as ApplicationStatus[]).filter(
    (s) => s !== applicant.status,
  );

  // Fetch skill badges for this candidate, filtered to this job's sector.
  const badgesQuery = api.skillTests.badgesForCandidate.useQuery(
    { candidateId: applicant.candidateId },
    { retry: false, staleTime: 5 * 60 * 1000 },
  );
  const matchingBadges = (badgesQuery.data ?? [])
    .filter(
      (b) =>
        applicant.jobSector === null || b.jobSectorMatch === applicant.jobSector,
    )
    .sort((a, b) => Number(b.isVerifiedTop) - Number(a.isVerifiedTop))
    .slice(0, 2);

  return (
    <div
      style={{
        padding: 16,
        background: "white",
        border: "1px solid var(--v2-ink-200)",
        borderRadius: "var(--v2-r-xl)",
        opacity: pending ? 0.6 : 1,
        transition: "opacity .15s",
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: "var(--v2-ink-900)",
            color: "var(--v2-accent)",
            display: "grid",
            placeItems: "center",
            fontFamily: "var(--v2-font-serif)",
            fontSize: 14,
            fontWeight: 900,
            overflow: "hidden",
            position: "relative",
            flexShrink: 0,
          }}
        >
          {applicant.candidateImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={applicant.candidateImage}
              alt={applicant.candidateName ?? ""}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            initials
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
              marginBottom: 2,
            }}
          >
            <Link
              href={`/p/${applicant.candidateId}`}
              style={{
                fontWeight: 700,
                fontSize: 14,
                color: "inherit",
                textDecoration: "none",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.textDecoration = "underline";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.textDecoration = "none";
              }}
            >
              {applicant.candidateName ?? "Anonymous"}
            </Link>
            <span className={statusChipClass(applicant.status)}>
              {STATUS_LABELS[applicant.status]}
            </span>
            {applicant.fitScore != null && (
              <span
                title="AI fit score · cached from scoreApplicantForEmployer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: "white",
                  background: "var(--v2-ink-950)",
                  padding: "2px 7px",
                  borderRadius: 999,
                  fontFamily: "var(--v2-font-mono)",
                }}
              >
                <span style={{ color: "var(--v2-accent)" }}>★</span>
                {applicant.fitScore}
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--v2-ink-600)",
            }}
          >
            {applicant.headline ?? "—"}
          </div>
          <div
            style={{
              fontSize: 11,
              color: "var(--v2-ink-500)",
              fontFamily: "var(--v2-font-mono)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginTop: 4,
            }}
          >
            {applicant.location ?? "—"}
            {applicant.yearsExperience != null &&
              ` · ${applicant.yearsExperience}y`}
            {` · Applied ${appliedLabel}`}
          </div>
          {applicationStatus === "interview" && (
            <div style={{ marginTop: 6 }}>
              <InterviewBadge applicationId={applicant.id} />
            </div>
          )}
          {matchingBadges.length > 0 && (
            <div
              style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 4 }}
            >
              {matchingBadges.map((b) => (
                <SkillBadgePill
                  key={b.topicId}
                  topicName={b.name}
                  isVerifiedTop={b.isVerifiedTop}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {applicant.coverNote && (
        <div
          style={{
            padding: "8px 12px",
            background: "var(--v2-ink-50)",
            borderRadius: 8,
            fontSize: 12,
            color: "var(--v2-ink-800)",
            marginTop: 12,
            whiteSpace: "pre-wrap",
            lineHeight: 1.45,
            maxHeight: 120,
            overflow: "auto",
          }}
        >
          {applicant.coverNote}
        </div>
      )}

      {applicant.screeningAnswers.length > 0 && (
        <details style={{ marginTop: 10 }}>
          <summary
            style={{
              cursor: "pointer",
              fontSize: 11,
              fontFamily: "var(--v2-font-mono)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--v2-ink-600)",
            }}
          >
            Answers · {applicant.screeningAnswers.length}
          </summary>
          <ol
            style={{
              paddingLeft: 18,
              marginTop: 6,
              display: "grid",
              gap: 4,
              fontSize: 12,
              color: "var(--v2-ink-700)",
            }}
          >
            {applicant.screeningAnswers.map((a, i) => (
              <li key={i}>
                <strong>{a.q}</strong>
                <div>{a.a || <em>No answer</em>}</div>
              </li>
            ))}
          </ol>
        </details>
      )}

      <div
        style={{
          marginTop: 12,
          display: "flex",
          gap: 8,
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Link
            href={`/employer/jobs/${jobId}/applicants/${applicant.id}`}
            className="v2-btn v2-btn-ghost v2-btn-sm"
            style={{ fontSize: 12 }}
          >
            Schedule interview <Icon name="arrowUpRight" size={12} />
          </Link>
          <Link
            href={`/p/${applicant.candidateId}`}
            className="v2-btn v2-btn-ghost v2-btn-sm"
            style={{ fontSize: 12 }}
          >
            Profile <Icon name="arrowUpRight" size={12} />
          </Link>
        </div>
        {canEdit && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="v2-btn v2-btn-ghost v2-btn-sm"
                style={{ fontSize: 12 }}
                disabled={pending}
              >
                Move to… <Icon name="arrowUpRight" size={12} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {otherStatuses.map((s) => (
                <DropdownMenuItem
                  key={s}
                  onSelect={() => onMove(applicant.id, s)}
                >
                  {STATUS_LABELS[s]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
