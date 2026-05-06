"use client";

import { useState } from "react";
import { Icon } from "@/components/shared/icon";

export function CopyLinkButton({
  variant = "chip",
  label,
  ariaLabel,
}: {
  variant?: "chip" | "button";
  label?: string;
  ariaLabel?: string;
} = {}) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");

  const handle = async () => {
    if (typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setState("copied");
      setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 2000);
    }
  };

  const idleLabel = label ?? (variant === "button" ? "Share" : "Copy link");
  const displayLabel =
    state === "copied"
      ? "Copied"
      : state === "error"
        ? "Press Cmd-C"
        : idleLabel;
  const iconName = state === "copied" ? "check" : "share";

  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={handle}
        className="v2-btn v2-btn-ghost"
        style={{
          background: state === "copied" ? "var(--v2-accent)" : undefined,
          borderColor: state === "copied" ? "var(--v2-accent)" : undefined,
        }}
        aria-label={ariaLabel ?? "Copy this page URL"}
      >
        <Icon name={iconName} size={14} />
        {displayLabel}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handle}
      className="v2-filter-chip"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        cursor: "pointer",
        background: state === "copied" ? "var(--v2-accent)" : undefined,
        color: state === "copied" ? "var(--v2-ink-950)" : undefined,
        borderColor: state === "copied" ? "var(--v2-accent)" : undefined,
      }}
      aria-label={ariaLabel ?? "Copy current search URL"}
    >
      <Icon name={iconName} size={12} />
      {displayLabel}
    </button>
  );
}
