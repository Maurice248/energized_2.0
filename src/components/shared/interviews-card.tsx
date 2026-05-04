"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/trpc/client";
import { Icon } from "@/components/shared/icon";

type Mode = "employer" | "candidate";
type Tab = "upcoming" | "past";

const MEDIUM_ICON = {
  video: "video",
  phone: "phone",
  in_person: "mapPin",
} as const;

type CommonRow = {
  interviewId: string;
  applicationId: string;
  jobId: string;
  jobTitle: string | null;
  startsAt: Date | string;
  durationMin: number;
  medium: "video" | "phone" | "in_person";
  details: string;
  status: "confirmed" | "completed" | "canceled" | "proposed" | "expired";
  cancelReason: string | null;
};

type EmployerRow = CommonRow & {
  candidateUserId: string;
  candidateName: string | null;
  candidateAvatarUrl: string | null;
};

type CandidateRow = CommonRow & {
  orgId: string;
  orgName: string;
  orgLogoUrl: string | null;
  orgLogoColor: string;
};

function toDate(d: Date | string): Date {
  return typeof d === "string" ? new Date(d) : d;
}

function startOfDay(d: Date): number {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c.getTime();
}

function fmtTime(d: Date | string): string {
  return toDate(d).toLocaleString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function dayLabel(dayMs: number, tab: Tab): string {
  const todayMs = startOfDay(new Date());
  const oneDayMs = 24 * 60 * 60 * 1000;
  if (tab === "upcoming") {
    if (dayMs === todayMs) return "TODAY";
    if (dayMs === todayMs + oneDayMs) return "TOMORROW";
  } else {
    if (dayMs === todayMs - oneDayMs) return "YESTERDAY";
  }
  return new Date(dayMs)
    .toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
    .toUpperCase();
}

function groupByDay<T extends { startsAt: Date | string }>(
  rows: T[],
): Map<number, T[]> {
  const out = new Map<number, T[]>();
  for (const r of rows) {
    const key = startOfDay(toDate(r.startsAt));
    const arr = out.get(key) ?? [];
    arr.push(r);
    out.set(key, arr);
  }
  return out;
}

function Avatar({
  url,
  fallbackChar,
  fallbackColor,
}: {
  url: string | null;
  fallbackChar: string;
  fallbackColor: string;
}) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        width={32}
        height={32}
        style={{ borderRadius: 999, objectFit: "cover" }}
      />
    );
  }
  return (
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: 999,
        background: fallbackColor,
        color: "white",
        display: "grid",
        placeItems: "center",
        fontWeight: 800,
        fontSize: 13,
        flexShrink: 0,
      }}
    >
      {fallbackChar.toUpperCase()}
    </div>
  );
}

function StatusChip({
  status,
  cancelReason,
}: {
  status: CommonRow["status"];
  cancelReason: string | null;
}) {
  if (status === "completed") {
    return <span className="v2-chip v2-chip-accent">Completed</span>;
  }
  if (status === "canceled") {
    const reason =
      cancelReason && cancelReason.length > 0
        ? cancelReason === "rescheduled"
          ? "Rescheduled"
          : cancelReason.length > 40
            ? cancelReason.slice(0, 40) + "…"
            : cancelReason
        : null;
    return (
      <span className="v2-chip v2-chip-coral">
        Canceled
        {reason && (
          <span style={{ marginLeft: 6, opacity: 0.8 }}>· {reason}</span>
        )}
      </span>
    );
  }
  return null;
}

function InterviewRow({
  row,
  mode,
  tab,
}: {
  row: EmployerRow | CandidateRow;
  mode: Mode;
  tab: Tab;
}) {
  const isEmployer = mode === "employer";
  const href = isEmployer
    ? `/employer/jobs/${row.jobId}/applicants/${row.applicationId}`
    : `/applications/${row.applicationId}`;

  const primary = isEmployer
    ? ((row as EmployerRow).candidateName ?? "Candidate")
    : (row as CandidateRow).orgName;

  const avatarUrl = isEmployer
    ? (row as EmployerRow).candidateAvatarUrl
    : (row as CandidateRow).orgLogoUrl;

  const fallbackColor = isEmployer
    ? "var(--v2-ink-950)"
    : (row as CandidateRow).orgLogoColor;

  const isVideo = row.medium === "video";
  const isJoinable =
    tab === "upcoming" && isVideo && row.details.startsWith("http");

  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        background: "var(--v2-ink-50)",
        borderRadius: 10,
        color: "inherit",
        flexWrap: "wrap",
      }}
    >
      <Avatar
        url={avatarUrl}
        fallbackChar={primary.charAt(0)}
        fallbackColor={fallbackColor}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "var(--v2-ink-950)",
          }}
        >
          {primary}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--v2-ink-500)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {row.jobTitle ?? "Untitled role"}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 13,
          fontWeight: 600,
          color: "var(--v2-ink-950)",
        }}
      >
        <span>
          {fmtTime(row.startsAt)} · {row.durationMin} min
        </span>
        <Icon name={MEDIUM_ICON[row.medium]} size={14} />
      </div>
      {tab === "upcoming" ? (
        isJoinable ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.open(row.details, "_blank", "noopener,noreferrer");
            }}
            className="v2-btn v2-btn-ghost v2-btn-sm"
          >
            Join
          </button>
        ) : null
      ) : (
        <StatusChip status={row.status} cancelReason={row.cancelReason} />
      )}
    </Link>
  );
}

function SkeletonRow() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        background: "var(--v2-ink-50)",
        borderRadius: 10,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 999,
          background: "var(--v2-ink-200)",
        }}
      />
      <div style={{ flex: 1 }}>
        <div
          style={{
            height: 12,
            width: "60%",
            background: "var(--v2-ink-200)",
            borderRadius: 4,
            marginBottom: 6,
          }}
        />
        <div
          style={{
            height: 10,
            width: "40%",
            background: "var(--v2-ink-200)",
            borderRadius: 4,
          }}
        />
      </div>
      <div
        style={{
          width: 70,
          height: 12,
          background: "var(--v2-ink-200)",
          borderRadius: 4,
        }}
      />
    </div>
  );
}

type Props =
  | { mode: "employer"; orgId: string }
  | { mode: "candidate" };

export function InterviewsCard(props: Props) {
  const [tab, setTab] = useState<Tab>("upcoming");

  const upcomingOrg = api.interviews.upcomingForOrg.useQuery(
    props.mode === "employer" ? { orgId: props.orgId } : (undefined as never),
    { enabled: props.mode === "employer" && tab === "upcoming" },
  );
  const recentOrg = api.interviews.recentForOrg.useQuery(
    props.mode === "employer" ? { orgId: props.orgId } : (undefined as never),
    { enabled: props.mode === "employer" && tab === "past" },
  );
  const upcomingCand = api.interviews.upcomingForCandidate.useQuery(undefined, {
    enabled: props.mode === "candidate" && tab === "upcoming",
  });
  const recentCand = api.interviews.recentForCandidate.useQuery(
    {},
    { enabled: props.mode === "candidate" && tab === "past" },
  );

  const isEmployer = props.mode === "employer";
  const upcomingQ = isEmployer ? upcomingOrg : upcomingCand;
  const pastQ = isEmployer ? recentOrg : recentCand;
  const activeQ = tab === "upcoming" ? upcomingQ : pastQ;

  const rows = (activeQ.data ?? []) as Array<EmployerRow | CandidateRow>;
  const grouped = groupByDay(rows);
  if (tab === "past") {
    for (const [key, bucket] of grouped) {
      grouped.set(
        key,
        bucket
          .slice()
          .sort(
            (a, b) =>
              toDate(b.startsAt).getTime() - toDate(a.startsAt).getTime(),
          ),
      );
    }
  }
  const dayKeys = Array.from(grouped.keys()).sort((a, b) =>
    tab === "upcoming" ? a - b : b - a,
  );

  const upcomingCount = upcomingQ.data?.length ?? 0;

  const emptyCopy =
    tab === "upcoming"
      ? "No interviews coming up this week."
      : isEmployer
        ? "No interviews completed in the last 30 days."
        : "Once an interview wraps, it'll show up here.";

  return (
    <section
      style={{
        background: "white",
        border: "1px solid var(--v2-ink-200)",
        borderRadius: "var(--v2-r-lg)",
        padding: 22,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "var(--v2-ink-950)",
          }}
        >
          Interviews
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            type="button"
            onClick={() => setTab("upcoming")}
            className={
              tab === "upcoming"
                ? "v2-chip v2-chip-accent"
                : "v2-chip"
            }
            style={{ cursor: "pointer", border: "none" }}
          >
            Upcoming
            {upcomingCount > 0 && (
              <span style={{ marginLeft: 6, opacity: 0.85 }}>
                · {upcomingCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setTab("past")}
            className={tab === "past" ? "v2-chip v2-chip-accent" : "v2-chip"}
            style={{ cursor: "pointer", border: "none" }}
          >
            Past
          </button>
        </div>
      </div>

      {activeQ.isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      ) : activeQ.isError ? (
        <div
          style={{
            fontSize: 13,
            color: "var(--v2-ink-500)",
            padding: "12px 0",
          }}
        >
          Couldn&apos;t load interviews.{" "}
          <button
            type="button"
            onClick={() => activeQ.refetch()}
            style={{
              color: "var(--v2-accent-deep)",
              fontWeight: 600,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            Retry
          </button>
        </div>
      ) : rows.length === 0 ? (
        <div
          style={{
            fontSize: 13,
            color: "var(--v2-ink-500)",
            padding: "12px 0",
          }}
        >
          {emptyCopy}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {dayKeys.map((dayMs) => (
            <div key={dayMs}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: "var(--v2-ink-500)",
                  marginBottom: 8,
                }}
              >
                {dayLabel(dayMs, tab)}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {grouped.get(dayMs)!.map((r) => (
                  <InterviewRow
                    key={r.interviewId}
                    row={r}
                    mode={props.mode}
                    tab={tab}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
