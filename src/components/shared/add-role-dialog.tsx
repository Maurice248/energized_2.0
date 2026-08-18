"use client";

import { useState, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SkillsPicker } from "@/components/shared/skills-picker";
import { AddressPicker } from "@/components/shared/address-picker";
import { SuggestionCombobox } from "@/components/shared/suggestion-combobox";
import { api } from "@/lib/trpc/client";

const SECTORS = [
  { value: "oil_gas", label: "Oil & Gas" },
  { value: "renewables", label: "Renewable Energy" },
  { value: "nuclear", label: "Nuclear" },
  { value: "utilities", label: "Power Utilities" },
  { value: "hydrogen", label: "Hydrogen" },
  { value: "power", label: "Power" },
  { value: "other", label: "Other" },
] as const;

const KNOWN_SECTOR_VALUES: Set<string> = new Set(SECTORS.map((s) => s.value));

const ROLE_SUGGESTIONS = [
  "Controls Engineer",
  "Instrumentation Technician",
  "Process Engineer",
  "Mechanical Engineer",
  "Electrical Engineer",
  "Automation Engineer",
  "SCADA Engineer",
  "Commissioning Engineer",
  "Pipeline Engineer",
  "Reservoir Engineer",
  "Drilling Engineer",
  "Production Engineer",
  "Reliability Engineer",
  "Maintenance Technician",
  "Field Operator",
  "Plant Operator",
  "Operations Manager",
  "Project Manager",
  "HSE Manager",
  "Safety Coordinator",
  "Wind Turbine Technician",
  "Solar PV Technician",
  "Power Systems Engineer",
  "Nuclear Operator",
  "Red Seal Electrician",
  "Millwright",
];

type SectorValue = (typeof SECTORS)[number]["value"];

export type RoleDialogInitial = {
  id: string;
  employerName: string;
  roleTitle: string;
  site: string | null;
  sector: string | null;
  commodity: string | null;
  rotation: string | null;
  startedAt: Date;
  endedAt: Date | null;
  summary: string | null;
  skills: string[];
};

export function AddRoleDialog({
  open,
  onOpenChange,
  onCreated,
  initial,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  initial?: RoleDialogInitial;
}) {
  const editing = Boolean(initial);
  const add = api.profile.addWorkHistory.useMutation({
    onSuccess: () => {
      onCreated();
      onOpenChange(false);
    },
  });
  const update = api.profile.updateWorkHistory.useMutation({
    onSuccess: () => {
      onCreated();
      onOpenChange(false);
    },
  });

  const [employerName, setEmployerName] = useState(initial?.employerName ?? "");
  const [roleTitle, setRoleTitle] = useState(initial?.roleTitle ?? "");
  const [site, setSite] = useState(initial?.site ?? "");
  const [sector, setSector] = useState<string>(
    initial?.sector === "other" && initial.commodity
      ? initial.commodity
      : initial?.sector ?? "",
  );
  const [rotation, setRotation] = useState(initial?.rotation ?? "");
  const [startedAt, setStartedAt] = useState(
    initial?.startedAt ? toDateInput(initial.startedAt) : "",
  );
  const [endedAt, setEndedAt] = useState(
    initial?.endedAt ? toDateInput(initial.endedAt) : "",
  );
  const [current, setCurrent] = useState(
    initial ? initial.endedAt === null : true,
  );
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [skills, setSkills] = useState<string[]>(initial?.skills ?? []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!employerName.trim() || !roleTitle.trim() || !startedAt) return;
    const sectorTrimmed = sector.trim();
    const sectorValue: SectorValue | null = sectorTrimmed
      ? KNOWN_SECTOR_VALUES.has(sectorTrimmed)
        ? (sectorTrimmed as SectorValue)
        : "other"
      : null;
    const commodity =
      sectorTrimmed && !KNOWN_SECTOR_VALUES.has(sectorTrimmed)
        ? sectorTrimmed
        : null;

    const patch = {
      employerName: employerName.trim(),
      roleTitle: roleTitle.trim(),
      site: site.trim() || null,
      sector: sectorValue,
      commodity,
      rotation: rotation.trim() || null,
      summary: summary.trim() || null,
      skills,
      startedAt: new Date(startedAt),
      endedAt: current || !endedAt ? null : new Date(endedAt),
    };
    if (initial) {
      update.mutate({ id: initial.id, patch });
    } else {
      add.mutate(patch);
    }
  };

  const mutation = editing ? update : add;

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
            {editing ? "Edit role" : "Add a role"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the details Ember uses to match you."
              : "Where did you work, and what did you do there?"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
          <div className="ob-grid">
            <LabeledInput
              label="Employer"
              value={employerName}
              onChange={setEmployerName}
              required
            />
            <SuggestionCombobox
              label="Role"
              value={roleTitle}
              onChange={setRoleTitle}
              suggestions={ROLE_SUGGESTIONS}
              pickPlaceholder="Pick a role from the list"
              customPlaceholder="Type your role title"
              otherLabel="Other — type your own role"
              required
            />
            <AddressPicker
              label="Site / location"
              value={site}
              onChange={setSite}
              placeholder="Search a Canadian city or site"
              dialogTitle="Site / location"
            />
            <SuggestionCombobox
              label="Sector"
              value={sector}
              onChange={setSector}
              suggestions={SECTORS}
              pickPlaceholder="Pick a sector"
              customPlaceholder="Name the sector"
              otherLabel="Other — name your sector"
            />
            <LabeledInput
              label="Rotation"
              value={rotation}
              onChange={setRotation}
              placeholder="14/7"
            />
            <div className="ob-field">
              <label>Started</label>
              <input
                className="v2-input-block"
                type="date"
                value={startedAt}
                onChange={(e) => setStartedAt(e.target.value)}
                required
              />
            </div>
            <div className="ob-field">
              <label>Ended</label>
              <input
                className="v2-input-block"
                type="date"
                value={endedAt}
                onChange={(e) => {
                  setEndedAt(e.target.value);
                  if (e.target.value) setCurrent(false);
                }}
                disabled={current}
              />
            </div>
            <div
              className="ob-field"
              style={{ display: "flex", alignItems: "center", gap: 10 }}
            >
              <input
                id="current"
                type="checkbox"
                checked={current}
                onChange={(e) => {
                  setCurrent(e.target.checked);
                  if (e.target.checked) setEndedAt("");
                }}
              />
              <label htmlFor="current" style={{ margin: 0, cursor: "pointer" }}>
                Current role
              </label>
            </div>
          </div>

          <div className="ob-field">
            <label>Summary</label>
            <textarea
              className="v2-input-block"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              placeholder="One paragraph on scope, scale, outcomes."
            />
          </div>

          <SkillsPicker
            skills={skills}
            setSkills={setSkills}
            label="Skills used · tap × to remove"
            cap={20}
            placement="up"
          />

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
                : "Add role"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="ob-field">
      <label>{label}</label>
      <input
        className="v2-input-block"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
      />
    </div>
  );
}

function toDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
