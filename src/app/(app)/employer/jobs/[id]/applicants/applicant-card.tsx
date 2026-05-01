"use client";

import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/shared/icon";

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

export function ApplicantCard({
  applicant,
  canEdit,
  onMove,
  pending,
}: {
  applicant: ApplicantRow;
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
        <Link
          href={`/p/${applicant.candidateId}`}
          className="v2-btn v2-btn-ghost v2-btn-sm"
          style={{ fontSize: 12 }}
        >
          View profile <Icon name="arrowUpRight" size={12} />
        </Link>
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
