"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";

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

  const confirm = api.interviews.confirmSlot.useMutation({ onSuccess: invalidate });
  const cancel = api.interviews.cancel.useMutation({ onSuccess: invalidate });
  const requestDifferent = api.interviews.requestDifferentTime.useMutation({ onSuccess: invalidate });

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
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--v2-ink-950)" }}>
                  {STATUS_LABELS[iv.status] ?? iv.status}
                  {iv.status === "canceled" && iv.cancelReason ? ` · ${iv.cancelReason}` : ""}
                </div>
                <div style={{ fontSize: 11, color: "var(--v2-ink-500)" }}>
                  {iv.proposedByName ? `proposed by ${iv.proposedByName}` : ""}
                </div>
              </div>

              <ul style={{ listStyle: "none", padding: 0, margin: "8px 0", display: "flex", flexDirection: "column", gap: 4 }}>
                {iv.slots.map((s) => (
                  <li key={s.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {iv.status === "proposed" && viewer === "candidate" ? (
                      <Button
                        size="sm"
                        variant={s.isConfirmed ? "default" : "outline"}
                        disabled={confirm.isPending}
                        onClick={() => confirm.mutate({ interviewId: iv.id, slotId: s.id })}
                      >
                        {fmtSlot(s.startsAt)}
                      </Button>
                    ) : (
                      <span style={{ fontSize: 13, fontWeight: s.isConfirmed ? 700 : 400, color: "var(--v2-ink-900)" }}>
                        {s.isConfirmed ? "✓ " : ""}{fmtSlot(s.startsAt)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>

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
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={cancel.isPending}
                    onClick={() => {
                      const reason = window.prompt("Reason (optional)", "") ?? undefined;
                      if (window.confirm("Cancel this interview?")) {
                        cancel.mutate({ interviewId: iv.id, reason });
                      }
                    }}
                  >
                    Cancel
                  </Button>
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
                      <Button size="sm" variant="ghost" onClick={() => setShowRequest(iv.id)}>
                        Request a different time
                      </Button>
                    )
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
