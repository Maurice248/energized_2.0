"use client";

import type { Dispatch, SetStateAction } from "react";
import { Icon } from "@/components/shared/icon";
import {
  CERTIFICATION_OPTIONS,
  EXPERIENCE_LEVEL_LABELS,
  HOURS_PER_WEEK_OPTIONS,
  ROTATION_OPTIONS,
  SALARY_CURRENCY_OPTIONS,
  SALARY_PERIOD_OPTIONS,
  SECTOR_LABELS,
  SUB_SECTOR_OPTIONS,
  WORK_SETUP_LABELS,
  type JobExperienceLevel,
  type JobSector,
  type JobWorkSetup,
} from "@/lib/jobs-options";

export type WizardDraft = {
  title: string;
  sector: JobSector | null;
  subSectors: string[];
  experienceLevel: JobExperienceLevel | null;
  location: string;
  workSetup: JobWorkSetup | null;
  rotationSchedule: string | null;
  hoursPerWeek: number | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  salaryPeriod: string;
  requiredCertifications: string[];
  screeningQuestions: { q: string; required: boolean }[];
  summary: string;
  description: string;
};

type Props = {
  draft: WizardDraft;
  setDraft: Dispatch<SetStateAction<WizardDraft>>;
  missing: string[];
};

function errCls(missing: string[], field: string) {
  return missing.includes(field) ? "v2-input-block has-error" : "v2-input-block";
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
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
      {children}
    </div>
  );
}

export function BasicsStep({ draft, setDraft, missing }: Props) {
  const toggleSub = (s: string) =>
    setDraft((d) => ({
      ...d,
      subSectors: d.subSectors.includes(s)
        ? d.subSectors.filter((x) => x !== s)
        : d.subSectors.length < 4
          ? [...d.subSectors, s]
          : d.subSectors,
    }));

  return (
    <div className="ob-grid">
      <div className="ob-field" style={{ gridColumn: "1/-1" }}>
        <label>Job title</label>
        <input
          className={errCls(missing, "title")}
          value={draft.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          placeholder="e.g. Senior Controls Engineer"
        />
      </div>

      <div className="ob-field" style={{ gridColumn: "1/-1" }}>
        <FieldLabel>Sector</FieldLabel>
        <div className="v2-filter-chips">
          {(Object.keys(SECTOR_LABELS) as JobSector[]).map((v) => (
            <button
              key={v}
              type="button"
              className={`v2-filter-chip ${draft.sector === v ? "active" : ""}`}
              onClick={() => setDraft((d) => ({ ...d, sector: v }))}
            >
              {SECTOR_LABELS[v]}
            </button>
          ))}
        </div>
      </div>

      <div className="ob-field" style={{ gridColumn: "1/-1" }}>
        <FieldLabel>Sub-sectors · pick up to 4</FieldLabel>
        <div className="v2-filter-chips">
          {SUB_SECTOR_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              className={`v2-filter-chip ${draft.subSectors.includes(s) ? "active" : ""}`}
              onClick={() => toggleSub(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="ob-field" style={{ gridColumn: "1/-1" }}>
        <FieldLabel>Experience level</FieldLabel>
        <div className="v2-filter-chips">
          {(Object.keys(EXPERIENCE_LEVEL_LABELS) as JobExperienceLevel[]).map(
            (v) => (
              <button
                key={v}
                type="button"
                className={`v2-filter-chip ${draft.experienceLevel === v ? "active" : ""}`}
                onClick={() =>
                  setDraft((d) => ({ ...d, experienceLevel: v }))
                }
              >
                {EXPERIENCE_LEVEL_LABELS[v]}
              </button>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

export function LocationStep({ draft, setDraft, missing }: Props) {
  const showRotation =
    draft.workSetup === "onsite" || draft.workSetup === "hybrid_preferred";

  return (
    <div className="ob-grid">
      <div className="ob-field" style={{ gridColumn: "1/-1" }}>
        <label>Location</label>
        <input
          className={errCls(missing, "location")}
          value={draft.location}
          onChange={(e) =>
            setDraft((d) => ({ ...d, location: e.target.value }))
          }
          placeholder="e.g. Calgary, AB or Remote — Canada"
        />
      </div>

      <div className="ob-field" style={{ gridColumn: "1/-1" }}>
        <FieldLabel>Work setup</FieldLabel>
        <div className="v2-filter-chips">
          {(Object.keys(WORK_SETUP_LABELS) as JobWorkSetup[]).map((v) => (
            <button
              key={v}
              type="button"
              className={`v2-filter-chip ${draft.workSetup === v ? "active" : ""}`}
              onClick={() => setDraft((d) => ({ ...d, workSetup: v }))}
            >
              {WORK_SETUP_LABELS[v]}
            </button>
          ))}
        </div>
      </div>

      {showRotation && (
        <div className="ob-field" style={{ gridColumn: "1/-1" }}>
          <FieldLabel>Rotation schedule</FieldLabel>
          <div className="v2-filter-chips">
            {ROTATION_OPTIONS.map((v) => {
              const active =
                (v === "None" && !draft.rotationSchedule) ||
                draft.rotationSchedule === v;
              return (
                <button
                  key={v}
                  type="button"
                  className={`v2-filter-chip ${active ? "active" : ""}`}
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      rotationSchedule: v === "None" ? null : v,
                    }))
                  }
                >
                  {v}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="ob-field" style={{ gridColumn: "1/-1" }}>
        <FieldLabel>Hours per week</FieldLabel>
        <div className="v2-filter-chips">
          {HOURS_PER_WEEK_OPTIONS.map((h) => (
            <button
              key={h}
              type="button"
              className={`v2-filter-chip ${draft.hoursPerWeek === h ? "active" : ""}`}
              onClick={() => setDraft((d) => ({ ...d, hoursPerWeek: h }))}
            >
              {h}
              {h === 44 ? "+" : ""}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PayStep({ draft, setDraft, missing }: Props) {
  const addQuestion = () =>
    setDraft((d) => ({
      ...d,
      screeningQuestions: [
        ...d.screeningQuestions,
        { q: "", required: false },
      ].slice(0, 8),
    }));

  const setQ = (idx: number, patch: Partial<{ q: string; required: boolean }>) =>
    setDraft((d) => ({
      ...d,
      screeningQuestions: d.screeningQuestions.map((row, i) =>
        i === idx ? { ...row, ...patch } : row,
      ),
    }));

  const removeQ = (idx: number) =>
    setDraft((d) => ({
      ...d,
      screeningQuestions: d.screeningQuestions.filter((_, i) => i !== idx),
    }));

  const toggleCert = (c: string) =>
    setDraft((d) => ({
      ...d,
      requiredCertifications: d.requiredCertifications.includes(c)
        ? d.requiredCertifications.filter((x) => x !== c)
        : [...d.requiredCertifications, c],
    }));

  const salaryErr = missing.includes("salary") || missing.includes("salaryRange");

  return (
    <div className="ob-grid">
      <div className="ob-field" style={{ gridColumn: "1/-1" }}>
        <FieldLabel>Salary range</FieldLabel>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr auto auto",
            gap: 10,
          }}
        >
          <input
            type="number"
            className={salaryErr ? "v2-input-block has-error" : "v2-input-block"}
            placeholder="Min"
            value={draft.salaryMin ?? ""}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                salaryMin: e.target.value === "" ? null : Number(e.target.value),
              }))
            }
          />
          <input
            type="number"
            className={salaryErr ? "v2-input-block has-error" : "v2-input-block"}
            placeholder="Max"
            value={draft.salaryMax ?? ""}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                salaryMax: e.target.value === "" ? null : Number(e.target.value),
              }))
            }
          />
          <select
            className="v2-input-block"
            value={draft.salaryCurrency}
            onChange={(e) =>
              setDraft((d) => ({ ...d, salaryCurrency: e.target.value }))
            }
          >
            {SALARY_CURRENCY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <select
            className="v2-input-block"
            value={draft.salaryPeriod}
            onChange={(e) =>
              setDraft((d) => ({ ...d, salaryPeriod: e.target.value }))
            }
          >
            {SALARY_PERIOD_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div
          style={{
            marginTop: 6,
            fontSize: 12,
            color: "var(--v2-ink-500)",
          }}
        >
          Jobseekers see a range, not your margin.
        </div>
      </div>

      <div className="ob-field" style={{ gridColumn: "1/-1" }}>
        <FieldLabel>Required certifications</FieldLabel>
        <div className="v2-filter-chips">
          {CERTIFICATION_OPTIONS.map((c) => (
            <button
              key={c}
              type="button"
              className={`v2-filter-chip ${draft.requiredCertifications.includes(c) ? "active" : ""}`}
              onClick={() => toggleCert(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="ob-field" style={{ gridColumn: "1/-1" }}>
        <FieldLabel>Screening questions · optional, up to 8</FieldLabel>
        {draft.screeningQuestions.map((row, idx) => (
          <div
            key={idx}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto auto",
              gap: 10,
              marginBottom: 8,
              alignItems: "center",
            }}
          >
            <input
              className="v2-input-block"
              placeholder="e.g. Do you hold a valid H2S Alive?"
              value={row.q}
              onChange={(e) => setQ(idx, { q: e.target.value })}
            />
            <label
              style={{
                display: "inline-flex",
                gap: 6,
                alignItems: "center",
                fontSize: 13,
                color: "var(--v2-ink-600)",
              }}
            >
              <input
                type="checkbox"
                checked={row.required}
                onChange={(e) => setQ(idx, { required: e.target.checked })}
              />
              Required
            </label>
            <button
              type="button"
              className="ob-icon-btn danger"
              onClick={() => removeQ(idx)}
              aria-label="Remove"
            >
              <Icon name="x" size={14} />
            </button>
          </div>
        ))}
        {draft.screeningQuestions.length < 8 && (
          <button
            type="button"
            className="v2-btn v2-btn-ghost v2-btn-sm"
            onClick={addQuestion}
          >
            <Icon name="plus" size={14} /> Add question
          </button>
        )}
      </div>
    </div>
  );
}

export function StoryStep({ draft, setDraft, missing }: Props) {
  return (
    <div className="ob-grid">
      <div className="ob-field" style={{ gridColumn: "1/-1" }}>
        <label>Summary</label>
        <input
          className={errCls(missing, "summary")}
          value={draft.summary}
          onChange={(e) =>
            setDraft((d) => ({ ...d, summary: e.target.value.slice(0, 200) }))
          }
          placeholder="One line — what the role is, not the company."
        />
        <div
          style={{
            marginTop: 6,
            fontSize: 12,
            color: "var(--v2-ink-500)",
            textAlign: "right",
          }}
        >
          {draft.summary.length}/200
        </div>
      </div>

      <div className="ob-field" style={{ gridColumn: "1/-1" }}>
        <label>Description</label>
        <textarea
          className={errCls(missing, "description")}
          rows={10}
          value={draft.description}
          onChange={(e) =>
            setDraft((d) => ({ ...d, description: e.target.value.slice(0, 4000) }))
          }
          placeholder="What the role actually is. What the first 90 days look like. Who it reports to."
        />
        <div
          style={{
            marginTop: 6,
            fontSize: 12,
            color:
              draft.description.length < 100
                ? "#A63A20"
                : "var(--v2-ink-500)",
            textAlign: "right",
          }}
        >
          {draft.description.length}/4000 · 100 min
        </div>
      </div>
    </div>
  );
}
