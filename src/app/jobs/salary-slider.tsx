"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function SalarySlider({
  initialValue,
  floor,
  ceil,
}: {
  initialValue: number | null;
  floor: number;
  ceil: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState<number>(initialValue ?? floor);

  const commit = (next: number | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next == null) params.delete("minSalary");
    else params.set("minSalary", String(next));
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `/jobs?${qs}` : "/jobs");
  };

  const display =
    value >= ceil
      ? `$${(ceil / 1000).toFixed(0)}k+`
      : `$${(value / 1000).toFixed(0)}k+`;

  return (
    <div>
      <input
        type="range"
        min={floor}
        max={ceil}
        step={5000}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        onMouseUp={() => commit(value > floor ? value : null)}
        onTouchEnd={() => commit(value > floor ? value : null)}
        onKeyUp={() => commit(value > floor ? value : null)}
        style={{ width: "100%", accentColor: "var(--v2-ink-950)" }}
        aria-label="Minimum salary"
      />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontFamily: "var(--v2-font-mono)",
          fontSize: 11,
          color: "var(--v2-ink-600)",
          marginTop: 6,
        }}
      >
        <span style={{ color: "var(--v2-ink-900)", fontWeight: 700 }}>
          {display}
        </span>
        <span>
          ${(floor / 1000).toFixed(0)}k – ${(ceil / 1000).toFixed(0)}k+
        </span>
      </div>
    </div>
  );
}
