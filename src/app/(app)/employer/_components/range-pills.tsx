"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { RANGES, type Range, rangeLabel } from "@/lib/range";

const LABELS: Record<Range, string> = {
  "7d": "7d",
  "30d": "30d",
  "90d": "90d",
  "qtd": "QTD",
  "all": "All",
};

export function RangePills({ active }: { active: Range }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, start] = useTransition();

  const select = (next: Range) => {
    if (next === active) return;
    const params = new URLSearchParams(searchParams.toString());
    if (next === "30d") {
      params.delete("range");
    } else {
      params.set("range", next);
    }
    const qs = params.toString();
    start(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  };

  return (
    <div
      role="tablist"
      aria-label="Date range"
      data-pending={pending ? "true" : "false"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 2,
        padding: 4,
        background: "white",
        borderRadius: 999,
        border: "1px solid var(--v2-ink-200)",
        boxShadow: "0 1px 2px rgba(11,13,18,0.04)",
      }}
    >
      {RANGES.map((r) => {
        const isActive = r === active;
        return (
          <button
            key={r}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-label={rangeLabel(r)}
            onClick={() => select(r)}
            style={{
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.01em",
              lineHeight: 1,
              borderRadius: 999,
              background: isActive ? "var(--v2-ink-950)" : "transparent",
              color: isActive ? "white" : "var(--v2-ink-500)",
              cursor: isActive ? "default" : "pointer",
              transition: "background-color 150ms, color 150ms",
            }}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.color = "var(--v2-ink-900)";
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.color = "var(--v2-ink-500)";
            }}
          >
            {LABELS[r]}
          </button>
        );
      })}
    </div>
  );
}
