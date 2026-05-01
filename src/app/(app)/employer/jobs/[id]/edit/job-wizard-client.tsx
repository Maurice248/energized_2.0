"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/shared/icon";
import { api } from "@/lib/trpc/client";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/api/root";
import {
  BasicsStep,
  LocationStep,
  PayStep,
  StoryStep,
  type WizardDraft,
} from "./wizard-steps";
import { JobPreviewCard } from "@/components/jobs/job-preview-card";

type JobRow = inferRouterOutputs<AppRouter>["jobs"]["getById"];

const STEPS = [
  { id: 1, eyebrow: "STEP 01 · THE ROLE", title: "What's the role?", hint: "The basics recruiters search by." },
  { id: 2, eyebrow: "STEP 02 · WHERE & HOW", title: "Where is this work?", hint: "Location, setup, rotation." },
  { id: 3, eyebrow: "STEP 03 · PAY & TICKETS", title: "What does it pay, what does it need?", hint: "Range and required certifications." },
  { id: 4, eyebrow: "STEP 04 · THE STORY", title: "Tell the candidate what this actually is.", hint: "Summary plus a real description." },
] as const;

const AUTOSAVE_DEBOUNCE_MS = 600;

const FIELD_TO_STEP: Record<string, number> = {
  title: 1,
  sector: 1,
  experienceLevel: 1,
  location: 2,
  workSetup: 2,
  salary: 3,
  salaryRange: 3,
  description: 4,
  summary: 4,
};

function firstStepWithMissing(fields: string[]): number | null {
  let min: number | null = null;
  for (const f of fields) {
    const s = FIELD_TO_STEP[f];
    if (s != null && (min == null || s < min)) min = s;
  }
  return min;
}

function toDraft(row: JobRow): WizardDraft {
  return {
    title: row.title ?? "",
    sector: row.sector,
    subSectors: row.subSectors,
    experienceLevel: row.experienceLevel,
    location: row.location ?? "",
    workSetup: row.workSetup,
    rotationSchedule: row.rotationSchedule,
    hoursPerWeek: row.hoursPerWeek,
    salaryMin: row.salaryMin,
    salaryMax: row.salaryMax,
    salaryCurrency: row.salaryCurrency ?? "CAD",
    salaryPeriod: row.salaryPeriod ?? "year",
    requiredCertifications: row.requiredCertifications,
    screeningQuestions: row.screeningQuestions,
    summary: row.summary ?? "",
    description: row.description ?? "",
  };
}

export function JobWizardClient({ initial }: { initial: JobRow }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stepFromUrl = Math.max(
    1,
    Math.min(4, parseInt(searchParams.get("step") ?? "1", 10) || 1),
  );
  const [step, setStep] = useState<number>(stepFromUrl);
  const [draft, setDraft] = useState<WizardDraft>(toDraft(initial));
  const [status] = useState(initial.status);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  const utils = api.useUtils();
  const updateDraft = api.jobs.updateDraft.useMutation();
  const publish = api.jobs.publish.useMutation();

  const savedSnapshotRef = useRef<WizardDraft>(draft);
  const pendingTimerRef = useRef<number | null>(null);

  const flushSave = useCallback(async () => {
    if (pendingTimerRef.current) {
      window.clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }
    if (JSON.stringify(savedSnapshotRef.current) === JSON.stringify(draft))
      return;
    await updateDraft.mutateAsync({
      id: initial.id,
      patch: {
        title: draft.title || null,
        sector: draft.sector,
        subSectors: draft.subSectors,
        experienceLevel: draft.experienceLevel,
        location: draft.location || null,
        workSetup: draft.workSetup,
        rotationSchedule: draft.rotationSchedule,
        hoursPerWeek: draft.hoursPerWeek,
        salaryMin: draft.salaryMin,
        salaryMax: draft.salaryMax,
        salaryCurrency: draft.salaryCurrency,
        salaryPeriod: draft.salaryPeriod as "year" | "hour" | "day",
        requiredCertifications: draft.requiredCertifications,
        screeningQuestions: draft.screeningQuestions.filter(
          (row) => row.q.trim().length > 0,
        ),
        summary: draft.summary || null,
        description: draft.description || null,
      },
    });
    savedSnapshotRef.current = draft;
  }, [draft, initial.id, updateDraft]);

  useEffect(() => {
    if (status !== "draft") return;
    if (pendingTimerRef.current) window.clearTimeout(pendingTimerRef.current);
    pendingTimerRef.current = window.setTimeout(() => {
      void flushSave();
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => {
      if (pendingTimerRef.current) window.clearTimeout(pendingTimerRef.current);
    };
  }, [draft, flushSave, status]);

  const goStep = async (next: number) => {
    const target = Math.max(1, Math.min(4, next));
    await flushSave();
    setStep(target);
    router.replace(`/employer/jobs/${initial.id}/edit?step=${target}`);
  };

  const activeStep = useMemo(() => STEPS.find((s) => s.id === step)!, [step]);

  const onPublish = async () => {
    setPublishError(null);
    setMissingFields([]);
    try {
      // Don't block publish on an autosave failure — the server-side
      // publish validator will report any actual missing fields. If the
      // save succeeds, great; if it doesn't, keep going.
      try {
        await flushSave();
      } catch {
        // swallow — publish is the source of truth for validation
      }
      await publish.mutateAsync({ id: initial.id });
      await utils.jobs.listForOrg.invalidate();
      await utils.jobs.getById.invalidate({ id: initial.id });
      router.push("/employer");
    } catch (e) {
      if (e instanceof Error) {
        const missingMatch = e.message.match(/^MISSING_FIELDS:(.+)$/);
        const quotaMatch = e.message.match(/^QUOTA_EXCEEDED:(\d+)\/(\d+)$/);
        if (missingMatch) {
          const fields = missingMatch[1].split(",").filter(Boolean);
          setMissingFields(fields);
          setPublishError(
            `Some required fields are missing: ${fields.join(", ")}. They're highlighted below.`,
          );
          const firstStep = firstStepWithMissing(fields);
          if (firstStep && firstStep !== step) {
            setStep(firstStep);
            router.replace(`/employer/jobs/${initial.id}/edit?step=${firstStep}`);
          }
        } else if (e.message === "BILLING_REQUIRED") {
          setPublishError(
            "Subscribe to a plan to publish your first role. Manage billing in the company profile.",
          );
        } else if (quotaMatch) {
          const used = quotaMatch[1];
          const quota = quotaMatch[2];
          setPublishError(
            `You've used ${used} of ${quota} job slots this billing cycle. Upgrade to a higher tier in your company profile to publish more.`,
          );
        } else {
          setPublishError(e.message);
        }
      } else {
        setPublishError("Publish failed.");
      }
    }
  };

  const saving = updateDraft.isPending;
  const canPublish = status === "draft";

  return (
    <div className="ob-shell v2">
      <header className="ob-top">
        <div style={{ display: "flex", gap: 28, alignItems: "center" }}>
          <Image
            src="/energized-logo.svg"
            alt="Energized"
            width={144}
            height={80}
            priority
            style={{ height: 40, width: "auto" }}
          />
          <div className="pp-crumbs">
            <Link href="/employer" style={{ color: "inherit" }}>
              Dashboard
            </Link>
            <span className="sep">/</span>
            <span>Jobs</span>
            <span className="sep">/</span>
            <span className="current">
              {status === "draft" ? "New role" : "Edit role"}
            </span>
          </div>
        </div>
        <div className="ob-top-right">
          <div className="ob-save-state">
            <span className="dot" />
            <span>{saving ? "Saving…" : "All changes saved"}</span>
          </div>
          {status !== "draft" && (
            <button
              className="v2-btn v2-btn-ghost v2-btn-sm"
              onClick={() => router.push(`/employer/jobs/${initial.id}/applicants`)}
            >
              Applicants →
            </button>
          )}
          <button
            className="v2-btn v2-btn-link"
            onClick={async () => {
              await flushSave();
              router.push("/employer");
            }}
          >
            Save &amp; exit →
          </button>
        </div>
      </header>

      <div className="ob-body">
        <aside className="ob-rail">
          <div className="ob-rail-title">
            Post a <em>new role</em>
          </div>
          <div className="ob-rail-sub">
            Four steps. Autosaved as you go.
          </div>

          <div className="ob-steps">
            {STEPS.map((s, i) => {
              const stateCls =
                step - 1 > i ? "done" : step - 1 === i ? "active" : "";
              return (
                <button
                  key={s.id}
                  className={`ob-step-row ${stateCls}`}
                  onClick={() => void goStep(s.id)}
                >
                  <div className="ob-step-pip">
                    {step - 1 > i ? (
                      <Icon name="check" size={14} />
                    ) : (
                      String(s.id).padStart(2, "0")
                    )}
                  </div>
                  <div>
                    <div className="ob-step-label">{s.title}</div>
                    <div className="ob-step-hint">{s.hint}</div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="ob-rail-completion">
            <div className="ob-completion-label">
              <span>Progress</span>
              <span className="ob-completion-pct">
                {Math.round(((step - 1) / (STEPS.length - 1)) * 100)}%
              </span>
            </div>
            <div className="ob-completion-bar">
              <div
                className="ob-completion-bar-fill"
                style={{
                  width: `${Math.round(((step - 1) / (STEPS.length - 1)) * 100)}%`,
                }}
              />
            </div>
          </div>
        </aside>

        <main className="ob-main">
          <div className="v2-eyebrow" style={{ marginBottom: 12 }}>
            {activeStep.eyebrow}
          </div>
          <h1 className="v2-h2" style={{ fontStyle: "italic", marginBottom: 8 }}>
            {activeStep.title}
          </h1>
          <p style={{ color: "var(--v2-ink-500)", marginBottom: 28 }}>
            {activeStep.hint}
          </p>

          {step === 1 && (
            <BasicsStep draft={draft} setDraft={setDraft} missing={missingFields} />
          )}
          {step === 2 && (
            <LocationStep draft={draft} setDraft={setDraft} missing={missingFields} />
          )}
          {step === 3 && (
            <PayStep draft={draft} setDraft={setDraft} missing={missingFields} />
          )}
          {step === 4 && (
            <div style={{ display: "grid", gap: 28 }}>
              <StoryStep draft={draft} setDraft={setDraft} missing={missingFields} />
              <div className="v2-eyebrow">Live preview</div>
              <JobPreviewCard
                job={{
                  title: draft.title || null,
                  sector: draft.sector,
                  experienceLevel: draft.experienceLevel,
                  location: draft.location || null,
                  workSetup: draft.workSetup,
                  rotationSchedule: draft.rotationSchedule,
                  salaryMin: draft.salaryMin,
                  salaryMax: draft.salaryMax,
                  salaryCurrency: draft.salaryCurrency,
                  salaryPeriod: draft.salaryPeriod,
                  requiredCertifications: draft.requiredCertifications,
                  summary: draft.summary || null,
                  description: draft.description || null,
                }}
              />
            </div>
          )}

          {publishError && (
            <div
              role="alert"
              style={{
                marginTop: 20,
                padding: "10px 14px",
                background: "var(--v2-coral-soft)",
                color: "#A63A20",
                borderRadius: 10,
                fontSize: 13,
                display: "flex",
                gap: 12,
                alignItems: "center",
                flexWrap: "wrap",
                justifyContent: "space-between",
              }}
            >
              <span>{publishError}</span>
              {(publishError.includes("Subscribe") ||
                publishError.includes("Upgrade")) && (
                <a
                  href="/employer/profile#ep-billing"
                  className="v2-btn v2-btn-primary v2-btn-sm"
                  style={{ flexShrink: 0 }}
                >
                  Go to billing →
                </a>
              )}
            </div>
          )}

          <div
            style={{
              marginTop: 32,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <button
              className="v2-btn v2-btn-ghost"
              onClick={() => void goStep(step - 1)}
              disabled={step === 1}
            >
              <Icon name="arrowUpRight" size={14} /> Back
            </button>

            {step < 4 ? (
              <button
                className="v2-btn v2-btn-primary"
                onClick={() => void goStep(step + 1)}
              >
                Next <Icon name="arrowUpRight" size={14} />
              </button>
            ) : (
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  className="v2-btn v2-btn-ghost"
                  onClick={async () => {
                    await flushSave();
                    router.push("/employer");
                  }}
                >
                  Save draft &amp; exit
                </button>
                <button
                  className="v2-btn v2-btn-primary"
                  onClick={() => void onPublish()}
                  disabled={!canPublish || publish.isPending || saving}
                >
                  {publish.isPending ? "Publishing…" : "Publish role"}
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
