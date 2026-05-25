"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { ScheduleInterviewModal } from "@/components/shared/schedule-interview-modal";

type Viewer = "candidate" | "employer";

function fmtSlot(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const STATUS_LABELS: Record<string, string> = {
  proposed: "Awaiting candidate",
  confirmed: "Confirmed",
  canceled: "Canceled",
  expired: "Expired",
  completed: "Completed",
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  recruiter: "Recruiter",
  hiring_manager: "Hiring Manager",
  viewer: "Viewer",
};

function fmtAttribution(name: string | null, role: string | null): string {
  if (!name) return "";
  const roleLabel = role ? ROLE_LABELS[role] ?? role : null;
  return roleLabel ? `${name} · ${roleLabel}` : name;
}

export function InterviewBlock({
  applicationId,
  viewer,
  scheduleSlot,            // employer-only "Schedule interview" trigger node (rendered above the list)
}: {
  applicationId: string;
  viewer: Viewer;
  scheduleSlot?: React.ReactNode;
}) {
  const list = api.interviews.list.useQuery({ applicationId });
  const utils = api.useUtils();
  const invalidate = () => void utils.interviews.list.invalidate({ applicationId });

  const [tentativePicks, setTentativePicks] = useState<Record<string, string>>({});

  const confirm = api.interviews.confirmSlot.useMutation({
    onSuccess: (_data, variables) => {
      invalidate();
      setTentativePicks((p) => {
        const next = { ...p };
        delete next[variables.interviewId];
        return next;
      });
    },
  });
  const cancel = api.interviews.cancel.useMutation({ onSuccess: invalidate });
  const requestDifferent = api.interviews.requestDifferentTime.useMutation({ onSuccess: invalidate });
  const setFeedback = api.interviews.setFeedback.useMutation({ onSuccess: invalidate });

  const [requestMessage, setRequestMessage] = useState("");
  const [showRequest, setShowRequest] = useState<string | null>(null); // interviewId
  const items = list.data ?? [];

  return (
    <section style={{ marginTop: 24 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--v2-ink-950)" }}>Interviews</h2>
        {viewer === "employer" && scheduleSlot}
      </div>

      {items.length === 0 ? (
        <div style={{ padding: 16, background: "var(--v2-ink-50)", border: "1px dashed var(--v2-ink-200)", borderRadius: 12, fontSize: 13, color: "var(--v2-ink-600)" }}>
          {viewer === "employer" ? "No interviews scheduled yet." : "No interviews proposed yet."}
        </div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map((iv) => (
            <li
              key={iv.id}
              style={{
                padding: 16,
                background: iv.status === "confirmed" ? "var(--v2-accent-soft)" : "white",
                border: "1px solid var(--v2-ink-200)",
                borderRadius: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--v2-ink-950)" }}>
                  {STATUS_LABELS[iv.status] ?? iv.status}
                  {iv.status === "canceled" && iv.cancelReason ? ` · ${iv.cancelReason}` : ""}
                </div>
                <div style={{ fontSize: 11, color: "var(--v2-ink-500)", textAlign: "right" }}>
                  {iv.proposedByName && (
                    <div>proposed by {fmtAttribution(iv.proposedByName, iv.proposedByRole)}</div>
                  )}
                  {iv.status === "canceled" && iv.canceledByName && (
                    <div>canceled by {fmtAttribution(iv.canceledByName, iv.canceledByRole)}</div>
                  )}
                </div>
              </div>

              {iv.status === "proposed" && viewer === "candidate" && (
                <div style={{ fontSize: 12, color: "var(--v2-ink-600)", marginTop: 6, marginBottom: 6 }}>
                  Tap a time below to select it, then confirm to lock it in.
                </div>
              )}

              <ul style={{ listStyle: "none", padding: 0, margin: "8px 0", display: "flex", flexDirection: "column", gap: 4 }}>
                {iv.slots.map((s) => (
                  <li key={s.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {iv.status === "proposed" && viewer === "candidate" ? (
                      <button
                        type="button"
                        className={`v2-interview-slot${tentativePicks[iv.id] === s.id ? " is-selected" : ""}`}
                        disabled={confirm.isPending}
                        onClick={() =>
                          setTentativePicks((p) => ({ ...p, [iv.id]: s.id }))
                        }
                      >
                        {tentativePicks[iv.id] === s.id ? "✓ " : ""}
                        {fmtSlot(s.startsAt)}
                      </button>
                    ) : (
                      <span style={{ fontSize: 13, fontWeight: s.isConfirmed ? 700 : 400, color: "var(--v2-ink-900)" }}>
                        {s.isConfirmed ? "✓ " : ""}{fmtSlot(s.startsAt)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>

              {iv.status === "proposed" && viewer === "candidate" && tentativePicks[iv.id] && (
                <div
                  style={{
                    marginTop: 12,
                    padding: 12,
                    background: "var(--v2-accent-soft)",
                    border: "1px solid var(--v2-accent)",
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 200, fontSize: 13, color: "var(--v2-ink-900)" }}>
                    You picked{" "}
                    <strong>
                      {fmtSlot(
                        iv.slots.find((s) => s.id === tentativePicks[iv.id])!.startsAt,
                      )}
                    </strong>
                    . This locks the interview in for both sides — confirm it below.
                  </div>
                  <button
                    type="button"
                    className="v2-interview-slot"
                    disabled={confirm.isPending}
                    onClick={() =>
                      confirm.mutate({
                        interviewId: iv.id,
                        slotId: tentativePicks[iv.id]!,
                      })
                    }
                  >
                    {confirm.isPending ? "Confirming…" : "Confirm this time"}
                  </button>
                  <button
                    type="button"
                    className="v2-interview-slot"
                    disabled={confirm.isPending}
                    onClick={() =>
                      setTentativePicks((p) => {
                        const next = { ...p };
                        delete next[iv.id];
                        return next;
                      })
                    }
                  >
                    Change pick
                  </button>
                </div>
              )}

              {iv.status === "confirmed" && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                  <span style={{ fontSize: 12, color: "var(--v2-ink-700)" }}>
                    {iv.medium === "video" ? "Video" : iv.medium === "phone" ? "Phone" : "In person"}: {iv.details}
                  </span>
                  <Link
                    href={`/api/interviews/${iv.id}/ics`}
                    className="v2-btn v2-btn-ghost v2-btn-sm"
                    style={{ marginLeft: "auto" }}
                  >
                    Add to calendar (.ics)
                  </Link>
                </div>
              )}

              {iv.notes && <div style={{ fontSize: 12, color: "var(--v2-ink-600)", marginTop: 6, fontStyle: "italic" }}>{iv.notes}</div>}

              {(iv.status === "proposed" || iv.status === "confirmed") && (
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button
                    type="button"
                    className="v2-btn v2-btn-coral-soft v2-btn-sm"
                    disabled={cancel.isPending}
                    onClick={() => {
                      const reason = window.prompt("Reason (optional)", "") ?? undefined;
                      if (window.confirm("Cancel this interview?")) {
                        cancel.mutate({ interviewId: iv.id, reason });
                      }
                    }}
                  >
                    Cancel
                  </button>
                  {viewer === "employer" && (
                    <ScheduleInterviewModal
                      applicationId={applicationId}
                      rescheduleInterviewId={iv.id}
                      onDone={invalidate}
                    />
                  )}
                  {viewer === "candidate" && iv.status === "proposed" && (
                    showRequest === iv.id ? (
                      <div style={{ display: "flex", gap: 6, flex: 1 }}>
                        <input
                          type="text"
                          placeholder="Why these times don't work (optional)"
                          value={requestMessage}
                          onChange={(e) => setRequestMessage(e.target.value)}
                          style={{ flex: 1, padding: 6, border: "1px solid var(--v2-ink-200)", borderRadius: 6 }}
                        />
                        <Button
                          size="sm"
                          onClick={() => {
                            requestDifferent.mutate({ interviewId: iv.id, message: requestMessage || undefined });
                            setRequestMessage("");
                            setShowRequest(null);
                          }}
                          disabled={requestDifferent.isPending}
                        >
                          Send
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="v2-btn v2-btn-accent-soft v2-btn-sm"
                        onClick={() => setShowRequest(iv.id)}
                      >
                        Request a different time
                      </button>
                    )
                  )}
                </div>
              )}

              {viewer === "employer" &&
                (iv.status === "completed" || iv.status === "canceled") && (
                  <FeedbackSection
                    initialFeedback={iv.feedback ?? ""}
                    feedbackByName={iv.feedbackByName ?? null}
                    feedbackByRole={iv.feedbackByRole ?? null}
                    onSave={(feedback) =>
                      setFeedback.mutate({ interviewId: iv.id, feedback })
                    }
                    isPending={setFeedback.isPending}
                  />
                )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function FeedbackSection({
  initialFeedback,
  feedbackByName,
  feedbackByRole,
  onSave,
  isPending,
}: {
  initialFeedback: string;
  feedbackByName: string | null;
  feedbackByRole: string | null;
  onSave: (feedback: string) => void;
  isPending: boolean;
}) {
  const [draft, setDraft] = useState(initialFeedback);
  const dirty = draft !== initialFeedback;

  return (
    <div
      style={{
        marginTop: 12,
        padding: 12,
        background: "var(--v2-ink-50)",
        border: "1px solid var(--v2-ink-200)",
        borderRadius: 10,
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: "var(--v2-ink-700)",
          marginBottom: 6,
        }}
      >
        Internal notes{" "}
        <span style={{ fontWeight: 400, color: "var(--v2-ink-500)" }}>
          · Only your team can see this
        </span>
      </div>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder="Stick to job-related observations: skills, certifications, technical fit."
        disabled={isPending}
        style={{
          width: "100%",
          padding: 8,
          border: "1px solid var(--v2-ink-200)",
          borderRadius: 8,
          fontSize: 13,
          fontFamily: "inherit",
          resize: "vertical",
          background: "white",
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 8,
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontSize: 11, color: "var(--v2-ink-500)" }}>
          {feedbackByName
            ? `Last edited by ${fmtAttribution(feedbackByName, feedbackByRole)}`
            : "Not yet written."}
        </div>
        <Button
          size="sm"
          disabled={!dirty || isPending}
          onClick={() => onSave(draft)}
        >
          {isPending ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
