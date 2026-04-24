"use client";

import { useState, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/trpc/client";

export type EducationDialogInitial = {
  id: string;
  school: string;
  degree: string | null;
  startedYear: string | null;
  endedYear: string | null;
  details: string | null;
};

export function AddEducationDialog({
  open,
  onOpenChange,
  onCreated,
  initial,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  initial?: EducationDialogInitial;
}) {
  const editing = Boolean(initial);
  const add = api.profile.addEducation.useMutation({
    onSuccess: () => {
      onCreated();
      onOpenChange(false);
    },
  });
  const update = api.profile.updateEducation.useMutation({
    onSuccess: () => {
      onCreated();
      onOpenChange(false);
    },
  });

  const [school, setSchool] = useState(initial?.school ?? "");
  const [degree, setDegree] = useState(initial?.degree ?? "");
  const [startedYear, setStartedYear] = useState(initial?.startedYear ?? "");
  const [endedYear, setEndedYear] = useState(initial?.endedYear ?? "");
  const [current, setCurrent] = useState(
    initial ? initial.endedYear === null : false,
  );
  const [details, setDetails] = useState(initial?.details ?? "");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!school.trim()) return;
    const patch = {
      school: school.trim(),
      degree: degree.trim() || null,
      startedYear: startedYear.trim() || null,
      endedYear: current || !endedYear.trim() ? null : endedYear.trim(),
      details: details.trim() || null,
    };
    if (initial) {
      update.mutate({ id: initial.id, patch });
    } else {
      add.mutate(patch);
    }
  };

  const mutation = editing ? update : add;
  const thisYear = new Date().getFullYear();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="v2 sm:max-w-xl bg-white p-6">
        <DialogHeader>
          <DialogTitle
            style={{
              fontFamily: "var(--v2-font-serif)",
              fontSize: 24,
              fontWeight: 400,
              letterSpacing: "-0.015em",
            }}
          >
            {editing ? "Edit education" : "Add education"}
          </DialogTitle>
          <DialogDescription>
            School, degree, and the years you studied there.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
          <div className="ob-field">
            <label>School / institution</label>
            <input
              className="v2-input-block"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              placeholder="e.g. University of Alberta"
              required
            />
          </div>

          <div className="ob-field">
            <label>Degree &amp; field</label>
            <input
              className="v2-input-block"
              value={degree}
              onChange={(e) => setDegree(e.target.value)}
              placeholder="e.g. B.Sc. Electrical Engineering"
            />
          </div>

          <div className="ob-grid">
            <div className="ob-field">
              <label>Started</label>
              <input
                className="v2-input-block"
                type="number"
                inputMode="numeric"
                min={1950}
                max={thisYear + 5}
                value={startedYear}
                onChange={(e) => setStartedYear(e.target.value)}
                placeholder="2010"
              />
            </div>
            <div className="ob-field">
              <label>Finished</label>
              <input
                className="v2-input-block"
                type="number"
                inputMode="numeric"
                min={1950}
                max={thisYear + 10}
                value={endedYear}
                onChange={(e) => {
                  setEndedYear(e.target.value);
                  if (e.target.value) setCurrent(false);
                }}
                disabled={current}
                placeholder="2014"
              />
            </div>
            <div
              className="ob-field"
              style={{ display: "flex", alignItems: "center", gap: 10 }}
            >
              <input
                id="edu-current"
                type="checkbox"
                checked={current}
                onChange={(e) => {
                  setCurrent(e.target.checked);
                  if (e.target.checked) setEndedYear("");
                }}
              />
              <label
                htmlFor="edu-current"
                style={{ margin: 0, cursor: "pointer" }}
              >
                Still studying
              </label>
            </div>
          </div>

          <div className="ob-field">
            <label>Details · optional</label>
            <textarea
              className="v2-input-block"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              placeholder="Minor, honours, thesis topic, relevant coursework…"
            />
          </div>

          {mutation.error && (
            <div
              style={{
                padding: "10px 14px",
                background: "var(--v2-coral-soft)",
                color: "#A63A20",
                borderRadius: "var(--v2-r-md)",
                fontSize: 13,
              }}
            >
              {mutation.error.message}
            </div>
          )}

          <div
            style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}
          >
            <button
              type="button"
              className="v2-btn v2-btn-ghost v2-btn-sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="v2-btn v2-btn-primary v2-btn-sm"
              disabled={mutation.isPending}
            >
              {mutation.isPending
                ? "Saving…"
                : editing
                  ? "Save changes"
                  : "Add education"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
