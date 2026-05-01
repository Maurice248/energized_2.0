"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { RANGES, type Range } from "@/lib/range";

const LABELS: Record<Range, string> = {
  "7d": "7d",
  "30d": "30d",
  "90d": "90d",
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
      className="inline-flex items-stretch overflow-hidden rounded-full border bg-background"
      data-pending={pending ? "true" : "false"}
      style={{ borderColor: "var(--v2-ink-200)" }}
    >
      {RANGES.map((r, i) => {
        const isActive = r === active;
        return (
          <button
            key={r}
            role="tab"
            aria-selected={isActive}
            onClick={() => select(r)}
            className="px-4 py-1.5 text-xs font-bold transition-colors"
            style={{
              color: isActive ? "white" : "var(--v2-ink-600)",
              background: isActive ? "var(--v2-accent)" : "transparent",
              boxShadow: isActive
                ? "inset 0 0 0 1px var(--v2-accent), 0 1px 3px rgba(28,170,226,0.25)"
                : "none",
              borderLeft:
                i > 0 && !isActive
                  ? "1px solid var(--v2-ink-200)"
                  : "1px solid transparent",
              cursor: "pointer",
            }}
          >
            {LABELS[r]}
          </button>
        );
      })}
    </div>
  );
}
