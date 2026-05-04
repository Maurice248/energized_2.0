"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/trpc/client";
import {
  ApplicantCard,
  STATUS_LABELS,
  type ApplicantRow,
  type ApplicationStatus,
} from "./applicant-card";

const COLUMNS: ApplicationStatus[] = [
  "submitted",
  "reviewed",
  "interview",
  "offer",
  "rejected",
];

export function ApplicantsBoard({
  initialApplicants,
  canEdit,
  jobId,
}: {
  initialApplicants: ApplicantRow[];
  canEdit: boolean;
  jobId: string;
}) {
  const router = useRouter();
  const [applicants, setApplicants] = useState<ApplicantRow[]>(initialApplicants);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateStatus = api.applications.updateStatus.useMutation({
    onSuccess: () => {
      setPendingId(null);
      router.refresh();
    },
    onError: (e, vars) => {
      setError(e.message);
      setPendingId(null);
      // Restore the original status by refetching from initialApplicants snapshot.
      const original = initialApplicants.find((a) => a.id === vars.id);
      if (original) {
        setApplicants((curr) =>
          curr.map((a) =>
            a.id === vars.id ? { ...a, status: original.status } : a,
          ),
        );
      }
    },
  });

  const buckets = useMemo(() => {
    const map: Record<ApplicationStatus, ApplicantRow[]> = {
      submitted: [],
      reviewed: [],
      interview: [],
      offer: [],
      rejected: [],
    };
    for (const a of applicants) map[a.status].push(a);
    return map;
  }, [applicants]);

  const onMove = (id: string, status: ApplicationStatus) => {
    setError(null);
    setPendingId(id);
    setApplicants((curr) =>
      curr.map((a) => (a.id === id ? { ...a, status } : a)),
    );
    updateStatus.mutate({ id, status });
  };

  return (
    <div>
      {error && (
        <div
          role="alert"
          style={{
            padding: "10px 14px",
            background: "var(--v2-coral-soft)",
            color: "#A63A20",
            borderRadius: 10,
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}
      <div
        style={{
          display: "flex",
          gap: 16,
          overflowX: "auto",
          paddingBottom: 12,
        }}
      >
        {COLUMNS.map((status) => {
          const items = buckets[status];
          return (
            <div
              key={status}
              style={{
                flex: "0 0 280px",
                background: "var(--v2-ink-50)",
                border: "1px solid var(--v2-ink-200)",
                borderRadius: "var(--v2-r-xl)",
                padding: 14,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingBottom: 8,
                  borderBottom: "1px solid var(--v2-ink-200)",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--v2-font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--v2-ink-700)",
                    fontWeight: 700,
                  }}
                >
                  {STATUS_LABELS[status]}
                </div>
                <span
                  style={{
                    fontFamily: "var(--v2-font-mono)",
                    fontSize: 11,
                    color: "var(--v2-ink-600)",
                  }}
                >
                  {items.length}
                </span>
              </div>

              {items.length === 0 ? (
                <div
                  style={{
                    padding: 18,
                    border: "1px dashed var(--v2-ink-200)",
                    borderRadius: 12,
                    textAlign: "center",
                    fontSize: 12,
                    color: "var(--v2-ink-500)",
                  }}
                >
                  No one here yet
                </div>
              ) : (
                items.map((a) => (
                  <ApplicantCard
                    key={a.id}
                    applicant={a}
                    jobId={jobId}
                    canEdit={canEdit}
                    onMove={onMove}
                    pending={pendingId === a.id}
                  />
                ))
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
