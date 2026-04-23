"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/shared/icon";

export type SuggestionOption = string | { value: string; label: string };

export function SuggestionCombobox({
  label,
  value,
  onChange,
  suggestions,
  pickPlaceholder,
  customPlaceholder,
  otherLabel,
  required,
  allowOther = true,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suggestions: readonly SuggestionOption[];
  pickPlaceholder: string;
  customPlaceholder: string;
  otherLabel: string;
  required?: boolean;
  allowOther?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [customMode, setCustomMode] = useState(false);
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

  const normalized = suggestions.map((s) =>
    typeof s === "string" ? { value: s, label: s } : s,
  );
  const selectedOption = normalized.find((o) => o.value === value);
  const displayValue =
    allowOther && !selectedOption ? value : selectedOption?.label ?? value;

  const pick = (v: string) => {
    onChange(v);
    setCustomMode(false);
    setOpen(false);
  };
  const chooseOther = () => {
    onChange("");
    setCustomMode(true);
    setOpen(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <div className="ob-field" ref={wrapRef}>
      <label>
        {label}{" "}
        {allowOther && customMode && (
          <span style={{ color: "var(--v2-accent-deep)" }}>· custom</span>
        )}
      </label>
      <div style={{ position: "relative" }}>
        <input
          ref={inputRef}
          className="v2-input-block"
          value={displayValue}
          readOnly={!allowOther}
          onChange={(e) => {
            if (!allowOther) return;
            onChange(e.target.value);
            if (!customMode) setOpen(true);
          }}
          onFocus={() => {
            if (!customMode) setOpen(true);
          }}
          onClick={() => {
            if (!allowOther) setOpen((v) => !v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder={customMode ? customPlaceholder : pickPlaceholder}
          required={required}
          style={{
            paddingRight: 36,
            cursor: allowOther ? "text" : "pointer",
          }}
          autoComplete="off"
        />
        <button
          type="button"
          aria-label={open ? `Close ${label} list` : `Show ${label} list`}
          onMouseDown={(e) => {
            e.preventDefault();
            setCustomMode(false);
            setOpen((v) => !v);
            inputRef.current?.focus();
          }}
          style={{
            position: "absolute",
            right: 10,
            top: "50%",
            transform: `translateY(-50%) rotate(${open ? 180 : 0}deg)`,
            background: "transparent",
            border: "none",
            padding: 4,
            cursor: "pointer",
            color: "var(--v2-ink-500)",
            transition: "transform .15s",
          }}
        >
          <Icon name="chevronDown" size={14} />
        </button>

        {open && (
          <div
            role="listbox"
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              right: 0,
              zIndex: 40,
              maxHeight: 280,
              overflowY: "auto",
              background: "white",
              border: "1px solid var(--v2-ink-200)",
              borderRadius: "var(--v2-r-md)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
              padding: 4,
            }}
          >
            {normalized.map((opt) => {
              const selected = opt.value === value;
              return (
                <div
                  key={opt.value}
                  role="option"
                  aria-selected={selected}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(opt.value);
                  }}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "calc(var(--v2-r-md) - 4px)",
                    fontSize: 14,
                    cursor: "pointer",
                    color: "var(--v2-ink-700)",
                    fontWeight: selected ? 700 : 400,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--v2-ink-50)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <span>{opt.label}</span>
                  {selected && <Icon name="check" size={14} />}
                </div>
              );
            })}
            {allowOther && (
              <>
                <div
                  style={{
                    margin: "4px 0",
                    borderTop: "1px solid var(--v2-ink-100)",
                  }}
                />
                <div
                  role="option"
                  aria-selected={false}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    chooseOther();
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
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--v2-ink-50)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <Icon name="plus" size={14} />
                  <span>{otherLabel}</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
