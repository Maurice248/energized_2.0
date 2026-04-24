"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/shared/icon";

export function JobsSearchInput({ initialQ }: { initialQ: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialQ);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    const trimmed = value.trim();
    if (trimmed) params.set("q", trimmed);
    else params.delete("q");
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `/jobs?${qs}` : "/jobs");
  };

  return (
    <form
      onSubmit={submit}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 20px",
        background: "white",
        border: "1px solid var(--v2-ink-200)",
        borderRadius: 999,
        maxWidth: 680,
      }}
    >
      <Icon name="search" size={18} />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search roles, companies, skills — try 'SCADA' or 'offshore wind'"
        style={{
          flex: 1,
          border: "none",
          outline: "none",
          background: "transparent",
          fontSize: 15,
          minWidth: 0,
        }}
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue("")}
          aria-label="Clear"
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: "var(--v2-ink-400)",
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          <Icon name="x" size={14} />
        </button>
      )}
      <button type="submit" className="v2-btn v2-btn-primary v2-btn-sm">
        Search
      </button>
    </form>
  );
}
