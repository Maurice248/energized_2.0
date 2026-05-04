"use client";

import Link from "next/link";
import { api } from "@/lib/trpc/client";
import { Icon } from "@/components/shared/icon";

const MEDIUM_ICON = {
  video: "video",
  phone: "phone",
  in_person: "mapPin",
} as const;

function fmtTime(iso: string | Date) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleString(undefined, { hour: "numeric", minute: "2-digit" });
}

function isToday(iso: string | Date): boolean {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function TodaysInterviews({ orgId }: { orgId: string }) {
  const q = api.interviews.upcomingForOrg.useQuery({ orgId });
  const items = (q.data ?? []).filter((r) => isToday(r.startsAt));

  return (
    <section
      style={{
        background: "white",
        border: "1px solid var(--v2-ink-200)",
        borderRadius: "var(--v2-r-lg)",
        padding: 22,
      }}
    >
      <div style={{ marginBottom: 12 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "var(--v2-ink-950)",
          }}
        >
          Today&apos;s interviews{" "}
          <span style={{ color: "var(--v2-ink-500)", fontWeight: 600 }}>
            ({items.length})
          </span>
        </div>
      </div>
      {items.length === 0 ? (
        <div
          style={{ fontSize: 13, color: "var(--v2-ink-500)", padding: "12px 0" }}
        >
          No interviews scheduled today.
        </div>
      ) : (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {items.map((r) => (
            <li
              key={r.interviewId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                background: "var(--v2-ink-50)",
                borderRadius: 10,
              }}
            >
              {r.candidateAvatarUrl ? (
                <img
                  src={r.candidateAvatarUrl}
                  alt=""
                  width={32}
                  height={32}
                  style={{ borderRadius: 999 }}
                />
              ) : (
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 999,
                    background: "var(--v2-ink-950)",
                    color: "white",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 800,
                    fontSize: 13,
                  }}
                >
                  {(r.candidateName ?? "?").charAt(0).toUpperCase()}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <Link
                  href={`/employer/jobs/${r.jobId}/applicants?focus=${r.applicationId}`}
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--v2-ink-950)",
                  }}
                >
                  {r.candidateName ?? "Candidate"}
                </Link>
                <div style={{ fontSize: 11, color: "var(--v2-ink-500)" }}>
                  {r.jobTitle}
                </div>
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--v2-ink-950)",
                }}
              >
                {fmtTime(r.startsAt)}
              </div>
              <Icon name={MEDIUM_ICON[r.medium]} size={14} />
              {r.medium === "video" && r.details.startsWith("http") && (
                <Link
                  href={r.details}
                  target="_blank"
                  rel="noopener"
                  className="v2-btn v2-btn-ghost v2-btn-sm"
                >
                  Join
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
