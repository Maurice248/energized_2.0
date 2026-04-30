"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/shared/icon";

export function JobsSearchInput({
  initialQ,
  initialLoc,
}: {
  initialQ: string;
  initialLoc: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(initialQ);
  const [loc, setLoc] = useState(initialLoc);

  // Sync the local input state when the URL params change (e.g., the user
  // clicks "Reset all" or navigates back). Without this, useState's initial
  // value sticks across re-renders and the inputs keep showing the old
  // search/location even after the URL has cleared.
  useEffect(() => {
    setQ(initialQ);
  }, [initialQ]);
  useEffect(() => {
    setLoc(initialLoc);
  }, [initialLoc]);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    const trimmedQ = q.trim();
    const trimmedLoc = loc.trim();
    if (trimmedQ) params.set("q", trimmedQ);
    else params.delete("q");
    if (trimmedLoc) params.set("loc", trimmedLoc);
    else params.delete("loc");
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `/jobs?${qs}` : "/jobs");
  };

  // Clear local state AND drop the param from the URL so the filter clears
  // immediately. Otherwise the user has to click Search after clicking X.
  const clearParam = (key: "q" | "loc") => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(key);
    params.delete("page");
    if (key === "q") setQ("");
    else setLoc("");
    const qs = params.toString();
    router.push(qs ? `/jobs?${qs}` : "/jobs");
  };

  return (
    <form
      onSubmit={submit}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: 6,
        background: "white",
        border: "1px solid var(--v2-ink-200)",
        borderRadius: 999,
        maxWidth: 820,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 16px",
          flex: 1,
          minWidth: 0,
        }}
      >
        <Icon name="search" size={18} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search roles, companies, skills — try 'SCADA'"
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            background: "transparent",
            fontSize: 15,
            minWidth: 0,
          }}
        />
        {q && (
          <button
            type="button"
            onClick={() => clearParam("q")}
            aria-label="Clear search"
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "var(--v2-ink-600)",
              display: "inline-flex",
              alignItems: "center",
              padding: 4,
              borderRadius: 6,
            }}
          >
            <Icon name="x" size={14} />
          </button>
        )}
      </div>
      <div
        style={{
          width: 1,
          height: 24,
          background: "var(--v2-ink-200)",
          flexShrink: 0,
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 16px",
          flex: 1,
          minWidth: 0,
          maxWidth: 280,
        }}
      >
        <Icon name="mapPin" size={16} />
        <input
          value={loc}
          onChange={(e) => setLoc(e.target.value)}
          placeholder="All of Canada"
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            background: "transparent",
            fontSize: 15,
            minWidth: 0,
          }}
        />
        {loc && (
          <button
            type="button"
            onClick={() => clearParam("loc")}
            aria-label="Clear location"
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "var(--v2-ink-600)",
              display: "inline-flex",
              alignItems: "center",
              padding: 4,
              borderRadius: 6,
            }}
          >
            <Icon name="x" size={14} />
          </button>
        )}
      </div>
      <button type="submit" className="v2-btn v2-btn-primary v2-btn-sm">
        Search
      </button>
    </form>
  );
}
