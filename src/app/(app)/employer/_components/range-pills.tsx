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
      className="inline-flex items-center gap-1 rounded-full border bg-background p-1"
      data-pending={pending ? "true" : "false"}
    >
      {RANGES.map((r) => {
        const isActive = r === active;
        return (
          <button
            key={r}
            role="tab"
            aria-selected={isActive}
            onClick={() => select(r)}
            className={
              isActive
                ? "rounded-full bg-[var(--v2-accent)] px-3 py-1 text-xs font-bold text-white"
                : "rounded-full px-3 py-1 text-xs font-bold text-muted-foreground hover:text-foreground"
            }
          >
            {LABELS[r]}
          </button>
        );
      })}
    </div>
  );
}
