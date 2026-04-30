"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Icon } from "@/components/shared/icon";
import { api } from "@/lib/trpc/client";

type ScreeningQuestion = { q: string; required: boolean };

export type ApplyViewerState =
  | { kind: "anonymous" }
  | { kind: "employer" }
  | { kind: "incomplete" }
  | { kind: "applied" }
  | {
      kind: "eligible";
      candidateName: string;
      candidateHeadline: string | null;
      candidateLocation: string | null;
      candidateResumeName: string | null;
    };

export function ApplyButtonAndModal({
  jobId,
  jobTitle,
  companyName,
  screeningQuestions,
  viewer,
  signInHref,
}: {
  jobId: string;
  jobTitle: string;
  companyName: string;
  screeningQuestions: ScreeningQuestion[];
  viewer: ApplyViewerState;
  signInHref: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [coverNote, setCoverNote] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = api.applications.submit.useMutation({
    onSuccess: () => setSuccess(true),
    onError: (e) => setError(e.message),
  });

  const firstRequiredMissing = useMemo(() => {
    if (viewer.kind !== "eligible") return null;
    const miss = screeningQuestions.find(
      (q) => q.required && !answers[q.q]?.trim(),
    );
    return miss?.q ?? null;
  }, [answers, screeningQuestions, viewer.kind]);

  const closeAndReset = () => {
    setOpen(false);
    setTimeout(() => {
      setSuccess(false);
      setError(null);
    }, 200);
  };

  if (viewer.kind === "anonymous") {
    return (
      <Link href={signInHref} className="v2-btn v2-btn-primary">
        Sign in to apply <Icon name="arrowUpRight" size={14} />
      </Link>
    );
  }

  if (viewer.kind === "employer") {
    return (
      <button
        className="v2-btn v2-btn-primary"
        disabled
        title="Employers can't apply to roles."
      >
        Employers can&apos;t apply
      </button>
    );
  }

  if (viewer.kind === "incomplete") {
    return (
      <Link
        href="/onboarding"
        className="v2-btn v2-btn-primary"
        style={{ whiteSpace: "nowrap" }}
      >
        Finish your profile to apply <Icon name="arrowUpRight" size={14} />
      </Link>
    );
  }

  if (viewer.kind === "applied") {
    return (
      <button
        className="v2-btn v2-btn-ghost"
        disabled
        title="You've already applied to this role."
      >
        <Icon name="check" size={14} /> Applied
      </button>
    );
  }

  return (
    <>
      <button
        className="v2-btn v2-btn-primary"
        onClick={() => {
          setError(null);
          setSuccess(false);
          setOpen(true);
        }}
      >
        Apply now <Icon name="arrowUpRight" size={14} />
      </button>

      <Dialog
        open={open}
        onOpenChange={(o) => (o ? setOpen(true) : closeAndReset())}
      >
        <DialogContent
          className="sm:max-w-lg"
          style={{ maxHeight: "90vh", overflow: "auto" }}
        >
          {success ? (
            <>
              <DialogHeader>
                <DialogTitle style={{ fontStyle: "italic" }}>
                  Application sent.
                </DialogTitle>
                <DialogDescription>
                  You&apos;ll hear back from {companyName} through Energized or
                  at your registered email.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <button
                  className="v2-btn v2-btn-ghost v2-btn-sm"
                  onClick={() => {
                    closeAndReset();
                    router.refresh();
                  }}
                >
                  Done
                </button>
                <button
                  className="v2-btn v2-btn-primary v2-btn-sm"
                  onClick={() => {
                    closeAndReset();
                    router.push("/applications");
                  }}
                >
                  View my applications
                </button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle style={{ fontStyle: "italic" }}>
                  Apply to {jobTitle}
                </DialogTitle>
                <DialogDescription>at {companyName}</DialogDescription>
              </DialogHeader>

              <div
                style={{
                  padding: 14,
                  border: "1px solid var(--v2-ink-200)",
                  borderRadius: 14,
                  background: "var(--v2-ink-50)",
                  marginBottom: 16,
                }}
              >
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
                  What {companyName} will see
                </div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>
                  {viewer.candidateName}
                </div>
                {viewer.candidateHeadline && (
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--v2-ink-600)",
                      marginTop: 2,
                    }}
                  >
                    {viewer.candidateHeadline}
                    {viewer.candidateLocation && ` · ${viewer.candidateLocation}`}
                  </div>
                )}
                {viewer.candidateResumeName && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--v2-ink-500)",
                      marginTop: 6,
                    }}
                  >
                    Resume: {viewer.candidateResumeName}
                  </div>
                )}
                <Link
                  href="/profile"
                  style={{
                    fontSize: 12,
                    color: "var(--v2-accent-deep)",
                    marginTop: 8,
                    display: "inline-block",
                  }}
                >
                  View my profile →
                </Link>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    display: "block",
                    fontFamily: "var(--v2-font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--v2-ink-500)",
                    marginBottom: 8,
                  }}
                >
                  Cover note · optional
                </label>
                <textarea
                  className="v2-input-block"
                  rows={4}
                  maxLength={1000}
                  value={coverNote}
                  onChange={(e) => setCoverNote(e.target.value)}
                  placeholder="One paragraph on why you're a fit."
                />
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--v2-ink-500)",
                    textAlign: "right",
                    marginTop: 4,
                  }}
                >
                  {coverNote.length}/1000
                </div>
              </div>

              {screeningQuestions.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      fontFamily: "var(--v2-font-mono)",
                      fontSize: 11,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--v2-ink-500)",
                      marginBottom: 10,
                    }}
                  >
                    Questions from {companyName}
                  </div>
                  <div style={{ display: "grid", gap: 12 }}>
                    {screeningQuestions.map((q, i) => (
                      <div key={i}>
                        <label
                          style={{
                            display: "block",
                            fontSize: 13,
                            color: "var(--v2-ink-800)",
                            marginBottom: 6,
                          }}
                        >
                          {q.q}
                          {q.required && (
                            <span
                              style={{
                                marginLeft: 6,
                                fontSize: 10,
                                color: "#A63A20",
                                fontFamily: "var(--v2-font-mono)",
                                letterSpacing: "0.06em",
                                textTransform: "uppercase",
                              }}
                            >
                              Required
                            </span>
                          )}
                        </label>
                        <input
                          className="v2-input-block"
                          value={answers[q.q] ?? ""}
                          onChange={(e) =>
                            setAnswers((a) => ({
                              ...a,
                              [q.q]: e.target.value,
                            }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div
                style={{
                  fontSize: 11,
                  color: "var(--v2-ink-500)",
                  marginBottom: 18,
                  fontStyle: "italic",
                }}
              >
                Your full profile, resume, and cover note will be shared only
                with {companyName}.
              </div>

              {error && (
                <div
                  role="alert"
                  style={{
                    padding: "10px 14px",
                    background: "var(--v2-coral-soft)",
                    color: "#A63A20",
                    borderRadius: 10,
                    fontSize: 13,
                    marginBottom: 12,
                  }}
                >
                  {error}
                </div>
              )}

              <DialogFooter>
                <button
                  className="v2-btn v2-btn-ghost v2-btn-sm"
                  onClick={closeAndReset}
                  disabled={apply.isPending}
                >
                  Cancel
                </button>
                <button
                  className="v2-btn v2-btn-primary v2-btn-sm"
                  disabled={apply.isPending || Boolean(firstRequiredMissing)}
                  title={
                    firstRequiredMissing
                      ? `Answer: ${firstRequiredMissing}`
                      : undefined
                  }
                  onClick={() => {
                    const payload = {
                      jobId,
                      coverNote: coverNote.trim() || null,
                      screeningAnswers: screeningQuestions.map((q) => ({
                        q: q.q,
                        a: (answers[q.q] ?? "").trim(),
                        required: q.required,
                      })),
                    };
                    apply.mutate(payload);
                  }}
                >
                  {apply.isPending ? "Sending…" : "Send application →"}
                </button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
