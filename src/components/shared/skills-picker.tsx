"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/shared/icon";

export const SKILL_SUGGESTIONS = [
  "PLC / SCADA",
  "Allen-Bradley",
  "Siemens TIA",
  "Honeywell DCS",
  "Emerson DeltaV",
  "Yokogawa CENTUM",
  "P&ID",
  "HAZOP",
  "Commissioning",
  "IEC 61850",
  "HART",
  "Foundation Fieldbus",
  "OPC UA",
  "PI System",
  "AutoCAD Electrical",
  "Python",
  "Solar PV",
  "Wind Turbine O&M",
  "Battery Storage",
  "Pipeline Integrity",
  "NACE / Corrosion Control",
  "Well Completions",
  "Drilling Operations",
  "Reservoir Engineering",
  "Refinery Operations",
  "LNG Operations",
  "Cogeneration",
  "SAP PM",
  "IBM Maximo",
  "Substation Design",
  "Relay Protection",
  "Power Transmission",
  "Aspen HYSYS",
  "Safety Instrumented Systems (SIS)",
  "Functional Safety (SIL)",
  "Hydrogen Electrolysis",
  "CCUS",
  "Field Engineering",
  "Instrument Calibration",
  "Root Cause Analysis",
  "FMEA",
  "Primavera P6",
  "Regulatory Compliance (AER / CER)",
  "FIFO / Rotational",
  "Team Leadership",
];

export function SkillsPicker({
  skills,
  setSkills,
  label,
  cap = 30,
  placement = "down",
}: {
  skills: string[];
  setSkills: (s: string[]) => void;
  label?: string;
  cap?: number;
  placement?: "up" | "down";
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const atCap = skills.length >= cap;
  const available = SKILL_SUGGESTIONS.filter((s) => !skills.includes(s));
  const q = input.trim().toLowerCase();
  const filtered = q
    ? available.filter((s) => s.toLowerCase().includes(q))
    : available;
  const matchesKnown = SKILL_SUGGESTIONS.some((s) => s.toLowerCase() === q);
  const alreadyAdded = skills.some((s) => s.toLowerCase() === q);
  const showCustom = q.length > 0 && !matchesKnown && !alreadyAdded;

  const add = (s: string) => {
    const trimmed = s.trim();
    if (!trimmed || skills.includes(trimmed) || atCap) return;
    setSkills([...skills, trimmed]);
    setInput("");
    setHighlight(0);
  };

  const dropdownPos =
    placement === "up"
      ? { bottom: "calc(100% + 4px)" as const }
      : { top: "calc(100% + 4px)" as const };
  const dropdownShadow =
    placement === "up"
      ? "0 -8px 24px rgba(0,0,0,0.08)"
      : "0 8px 24px rgba(0,0,0,0.08)";
  const chevronClosed = placement === "up" ? 180 : 0;
  const chevronOpen = placement === "up" ? 0 : 180;

  return (
    <div ref={wrapRef} className={label ? "ob-field" : undefined}>
      {label && (
        <label>
          {label} · {skills.length}/{cap}
        </label>
      )}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          marginBottom: skills.length > 0 ? 10 : 0,
          minHeight: skills.length > 0 ? 32 : 0,
        }}
      >
        {skills.map((s) => (
          <span key={s} className="v2-chip v2-chip-outline">
            {s}
            <span
              onClick={() => setSkills(skills.filter((x) => x !== s))}
              style={{
                marginLeft: 6,
                cursor: "pointer",
                opacity: 0.6,
              }}
            >
              ×
            </span>
          </span>
        ))}
      </div>
      <div style={{ position: "relative" }}>
        <input
          ref={inputRef}
          className="v2-input-block"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onFocus={() => !atCap && setOpen(true)}
          onKeyDown={(e) => {
            const total = filtered.length + (showCustom ? 1 : 0);
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setHighlight((h) => Math.min(h + 1, Math.max(total - 1, 0)));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((h) => Math.max(h - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              if (showCustom && highlight === filtered.length) {
                add(input);
              } else if (filtered[highlight]) {
                add(filtered[highlight]);
              } else if (showCustom) {
                add(input);
              }
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder={
            atCap
              ? `${cap}-skill cap reached`
              : "Pick from the list or type a custom skill"
          }
          disabled={atCap}
          style={{ paddingRight: 36 }}
          autoComplete="off"
        />
        <button
          type="button"
          aria-label={open ? "Close skill list" : "Show skill list"}
          onMouseDown={(e) => {
            e.preventDefault();
            if (atCap) return;
            setOpen((v) => !v);
            inputRef.current?.focus();
          }}
          disabled={atCap}
          style={{
            position: "absolute",
            right: 10,
            top: "50%",
            transform: `translateY(-50%) rotate(${open ? chevronOpen : chevronClosed}deg)`,
            background: "transparent",
            border: "none",
            padding: 4,
            cursor: atCap ? "not-allowed" : "pointer",
            color: "var(--v2-ink-500)",
            transition: "transform .15s",
          }}
        >
          <Icon name="chevronDown" size={14} />
        </button>

        {open && !atCap && (
          <div
            role="listbox"
            style={{
              position: "absolute",
              ...dropdownPos,
              left: 0,
              right: 0,
              zIndex: 40,
              maxHeight: 260,
              overflowY: "auto",
              background: "white",
              border: "1px solid var(--v2-ink-200)",
              borderRadius: "var(--v2-r-md)",
              boxShadow: dropdownShadow,
              padding: 4,
            }}
          >
            {filtered.map((s, i) => (
              <div
                key={s}
                role="option"
                aria-selected={highlight === i}
                onMouseEnter={() => setHighlight(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  add(s);
                }}
                style={{
                  padding: "8px 12px",
                  borderRadius: "calc(var(--v2-r-md) - 4px)",
                  fontSize: 14,
                  cursor: "pointer",
                  color: "var(--v2-ink-700)",
                  background:
                    highlight === i ? "var(--v2-ink-50)" : "transparent",
                }}
              >
                {s}
              </div>
            ))}
            {filtered.length === 0 && !showCustom && (
              <div
                style={{
                  padding: "10px 12px",
                  fontSize: 13,
                  color: "var(--v2-ink-500)",
                }}
              >
                {alreadyAdded
                  ? "Already added"
                  : available.length === 0
                    ? "All suggestions added"
                    : "No matches"}
              </div>
            )}
            {showCustom && (
              <>
                {filtered.length > 0 && (
                  <div
                    style={{
                      margin: "4px 0",
                      borderTop: "1px solid var(--v2-ink-100)",
                    }}
                  />
                )}
                <div
                  role="option"
                  aria-selected={highlight === filtered.length}
                  onMouseEnter={() => setHighlight(filtered.length)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    add(input);
                  }}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "calc(var(--v2-r-md) - 4px)",
                    fontSize: 14,
                    cursor: "pointer",
                    color: "var(--v2-accent-deep)",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background:
                      highlight === filtered.length
                        ? "var(--v2-ink-50)"
                        : "transparent",
                  }}
                >
                  <Icon name="plus" size={14} />
                  <span>
                    Add custom: <strong>{input.trim()}</strong>
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
