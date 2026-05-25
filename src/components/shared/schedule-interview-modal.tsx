"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateTimePicker } from "@/components/shared/datetime-picker";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/trpc/client";

type Medium = "video" | "phone" | "in_person";
const MEDIUM_LABELS: Record<Medium, string> = { video: "Video", phone: "Phone", in_person: "In person" };
const MEDIUM_PLACEHOLDERS: Record<Medium, string> = {
  video: "https://meet.example.com/abc",
  phone: "+1 555 555 5555",
  in_person: "123 Main St, Calgary AB",
};
const DURATIONS = [15, 30, 45, 60, 90, 120];

export function ScheduleInterviewModal({
  applicationId,
  rescheduleInterviewId,
  trigger,
  triggerClassName,
  triggerLabel,
  onDone,
}: {
  applicationId: string;
  rescheduleInterviewId?: string;
  trigger?: React.ReactNode;
  triggerClassName?: string;
  triggerLabel?: string;
  onDone?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [medium, setMedium] = useState<Medium>("video");
  const [details, setDetails] = useState("");
  const [durationMin, setDurationMin] = useState(60);
  const [notes, setNotes] = useState("");
  const [slots, setSlots] = useState<string[]>(["", ""]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const utils = api.useUtils();
  const propose = api.interviews.proposeSlots.useMutation({
    onSuccess: () => {
      void utils.interviews.list.invalidate({ applicationId });
      setOpen(false);
      setErrorMessage(null);
      onDone?.();
    },
    onError: (err) => setErrorMessage(err.message ?? "Could not send proposal."),
  });
  const reschedule = api.interviews.reschedule.useMutation({
    onSuccess: () => {
      void utils.interviews.list.invalidate({ applicationId });
      setOpen(false);
      setErrorMessage(null);
      onDone?.();
    },
    onError: (err) => setErrorMessage(err.message ?? "Could not reschedule."),
  });

  const submit = () => {
    setErrorMessage(null);
    const validSlots = slots
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((s) => new Date(s));
    if (validSlots.length < 2) {
      alert("Please provide at least 2 slots.");
      return;
    }
    if (validSlots.some((d) => isNaN(d.getTime()))) {
      alert("One or more slots are invalid datetimes.");
      return;
    }
    if (rescheduleInterviewId) {
      reschedule.mutate({
        interviewId: rescheduleInterviewId,
        medium,
        details,
        durationMin,
        notes: notes || undefined,
        slots: validSlots,
      });
    } else {
      propose.mutate({
        applicationId,
        medium,
        details,
        durationMin,
        notes: notes || undefined,
        slots: validSlots,
      });
    }
  };

  const isPending = propose.isPending || reschedule.isPending;

  const defaultTriggerLabel =
    triggerLabel ??
    (rescheduleInterviewId ? "Reschedule" : "Schedule interview");
  const defaultTriggerClassName =
    triggerClassName ??
    (rescheduleInterviewId
      ? "v2-btn v2-btn-accent-soft v2-btn-sm"
      : "v2-btn v2-btn-accent-deep v2-btn-sm");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setErrorMessage(null);
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <button type="button" className={defaultTriggerClassName}>
            {defaultTriggerLabel}
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{rescheduleInterviewId ? "Reschedule interview" : "Schedule interview"}</DialogTitle>
        </DialogHeader>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <Label>Medium</Label>
            <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
              {(["video", "phone", "in_person"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMedium(m)}
                  style={{
                    padding: "6px 12px",
                    fontSize: 13,
                    fontWeight: 700,
                    borderRadius: 999,
                    border: `1px solid ${medium === m ? "var(--v2-ink-950)" : "var(--v2-ink-200)"}`,
                    background: medium === m ? "var(--v2-ink-950)" : "white",
                    color: medium === m ? "white" : "var(--v2-ink-700)",
                    cursor: "pointer",
                  }}
                >
                  {MEDIUM_LABELS[m]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="details">Details</Label>
            <Input
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={MEDIUM_PLACEHOLDERS[medium]}
            />
          </div>
          <div>
            <Label htmlFor="duration">Duration</Label>
            <select
              id="duration"
              value={durationMin}
              onChange={(e) => setDurationMin(parseInt(e.target.value, 10))}
              style={{ padding: 8, border: "1px solid var(--v2-ink-200)", borderRadius: 8 }}
            >
              {DURATIONS.map((d) => (
                <option key={d} value={d}>{d} min</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={1000}
              rows={3}
              style={{ width: "100%", padding: 8, border: "1px solid var(--v2-ink-200)", borderRadius: 8 }}
            />
          </div>
          <div>
            <Label>Proposed times</Label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
              {slots.map((s, i) => (
                <div key={i} style={{ display: "flex", gap: 6 }}>
                  <DateTimePicker
                    className="min-w-0 flex-1"
                    value={s}
                    onChange={(nextValue) => {
                      const next = [...slots];
                      next[i] = nextValue;
                      setSlots(next);
                    }}
                  />
                  {slots.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setSlots(slots.filter((_, idx) => idx !== i))}
                      aria-label="Remove slot"
                      style={{ padding: "0 10px", border: "1px solid var(--v2-ink-200)", borderRadius: 8, background: "white", cursor: "pointer" }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {slots.length < 5 && (
                <button
                  type="button"
                  onClick={() => setSlots([...slots, ""])}
                  style={{ alignSelf: "flex-start", padding: "6px 12px", fontSize: 13, fontWeight: 700, color: "var(--v2-accent-deep)", background: "transparent", border: "none", cursor: "pointer" }}
                >
                  + Add another slot
                </button>
              )}
            </div>
          </div>
        </div>
        {errorMessage && (
          <div
            style={{
              marginTop: 8,
              padding: "10px 12px",
              background: "#fff5f5",
              border: "1px solid #fecaca",
              borderRadius: 8,
              color: "#742a2a",
              fontSize: 13,
            }}
          >
            {errorMessage}
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>Cancel</Button>
          <Button onClick={submit} disabled={isPending}>
            {isPending ? "Sending…" : rescheduleInterviewId ? "Send updated times" : "Send proposal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
