"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Icon } from "@/components/shared/icon";
import { api } from "@/lib/trpc/client";

const SECTORS = [
  { value: "", label: "All sectors" },
  { value: "oil_gas", label: "Oil & gas" },
  { value: "renewables", label: "Renewables" },
  { value: "nuclear", label: "Nuclear" },
  { value: "utilities", label: "Utilities" },
  { value: "hydrogen", label: "Hydrogen" },
  { value: "power", label: "Power" },
  { value: "other", label: "Other" },
];

const SETUPS = [
  { value: "", label: "Any setup" },
  { value: "on_site", label: "On-site" },
  { value: "hybrid", label: "Hybrid" },
  { value: "remote", label: "Remote" },
  { value: "flexible", label: "Flexible" },
];

const YEARS_OPTIONS = [
  { value: "", label: "Any experience" },
  { value: "2", label: "2+ yrs" },
  { value: "5", label: "5+ yrs" },
  { value: "10", label: "10+ yrs" },
  { value: "15", label: "15+ yrs" },
];

export function CandidatesFilters({
  initial,
}: {
  initial: {
    q: string;
    sector: string;
    setup: string;
    minYears: string;
    openToWork: boolean;
    badges: string;
  };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(initial.q);

  // Fetch all skill topics to build the badge filter options
  const topicsQuery = api.skillTests.listTopics.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });
  const badgeOptions = topicsQuery.data?.flatMap((s) => [
    { value: s.slug, label: s.name },
    ...s.roles.map((r) => ({ value: r.slug, label: `${s.name} · ${r.name}` })),
  ]) ?? [];

  // Active badge slugs parsed from the initial badges URL param
  const activeBadgeSlugs = initial.badges
    ? initial.badges.split(",").filter(Boolean)
    : [];

  const navigate = (next: Partial<typeof initial> & { badges?: string }) => {
    const params = new URLSearchParams(searchParams.toString());
    const merged = { ...initial, ...next };
    if (merged.q) params.set("q", merged.q);
    else params.delete("q");
    if (merged.sector) params.set("sector", merged.sector);
    else params.delete("sector");
    if (merged.setup) params.set("setup", merged.setup);
    else params.delete("setup");
    if (merged.minYears) params.set("minYears", merged.minYears);
    else params.delete("minYears");
    if (merged.openToWork) params.delete("openToWork");
    else params.set("openToWork", "0");
    if (merged.badges) params.set("badges", merged.badges);
    else params.delete("badges");
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const addBadge = (slug: string) => {
    if (!slug || activeBadgeSlugs.includes(slug)) return;
    navigate({ badges: [...activeBadgeSlugs, slug].join(",") });
  };

  const removeBadge = (slug: string) => {
    navigate({ badges: activeBadgeSlugs.filter((s) => s !== slug).join(",") });
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    navigate({ q: q.trim() });
  };

  const anyFilter =
    initial.q ||
    initial.sector ||
    initial.setup ||
    initial.minYears ||
    initial.badges ||
    !initial.openToWork;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: 6,
          background: "white",
          border: "1px solid var(--v2-ink-200)",
          borderRadius: 999,
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
            placeholder="Search names, headlines, skills, locations…"
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: 15,
              minWidth: 0,
            }}
          />
        </div>
        <button
          type="submit"
          className="v2-btn v2-btn-primary v2-btn-sm"
          style={{ flexShrink: 0 }}
        >
          Search
        </button>
      </form>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 12,
        }}
      >
        <FilterSelect
          label="Sector"
          value={initial.sector}
          options={SECTORS}
          onChange={(v) => navigate({ sector: v })}
        />
        <FilterSelect
          label="Work setup"
          value={initial.setup}
          options={SETUPS}
          onChange={(v) => navigate({ setup: v })}
        />
        <FilterSelect
          label="Experience"
          value={initial.minYears}
          options={YEARS_OPTIONS}
          onChange={(v) => navigate({ minYears: v })}
        />

        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            fontWeight: 600,
            color: "var(--v2-ink-700)",
            padding: "6px 12px",
            background: "white",
            border: "1px solid var(--v2-ink-200)",
            borderRadius: 999,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={initial.openToWork}
            onChange={(e) => navigate({ openToWork: e.target.checked })}
            style={{ accentColor: "var(--v2-ink-950)" }}
          />
          Open to work only
        </label>

        {/* Badge filter: add via select, remove via × chip */}
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            fontWeight: 600,
            color: "var(--v2-ink-700)",
            background: "white",
            border: "1px solid var(--v2-ink-200)",
            borderRadius: 999,
            padding: "6px 14px",
          }}
        >
          <span style={{ color: "var(--v2-ink-500)" }}>Verified skill:</span>
          <select
            value=""
            disabled={topicsQuery.isLoading}
            onChange={(e) => { addBadge(e.target.value); e.target.value = ""; }}
            style={{
              appearance: "none",
              border: "none",
              background: "transparent",
              fontSize: 13,
              fontWeight: 700,
              color: "var(--v2-ink-950)",
              cursor: "pointer",
              paddingRight: 4,
            }}
          >
            <option value="">Add filter…</option>
            {badgeOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        {/* Active badge chips */}
        {activeBadgeSlugs.map((slug) => {
          const opt = badgeOptions.find((o) => o.value === slug);
          return (
            <span
              key={slug}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                fontWeight: 700,
                color: "white",
                background: "var(--v2-ink-950)",
                padding: "4px 10px",
                borderRadius: 999,
              }}
            >
              {opt?.label ?? slug}
              <button
                type="button"
                onClick={() => removeBadge(slug)}
                style={{
                  all: "unset",
                  cursor: "pointer",
                  lineHeight: 1,
                  opacity: 0.7,
                }}
                aria-label={`Remove ${opt?.label ?? slug} filter`}
              >
                ×
              </button>
            </span>
          );
        })}

        {anyFilter && (
          <button
            type="button"
            onClick={() => {
              router.push(pathname);
              setQ("");
            }}

            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--v2-ink-500)",
              padding: "6px 10px",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Reset all
          </button>
        )}
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (next: string) => void;
}) {
  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontSize: 13,
        fontWeight: 600,
        color: "var(--v2-ink-700)",
        background: "white",
        border: "1px solid var(--v2-ink-200)",
        borderRadius: 999,
        padding: "6px 14px",
      }}
    >
      <span style={{ color: "var(--v2-ink-500)" }}>{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          appearance: "none",
          border: "none",
          background: "transparent",
          fontSize: 13,
          fontWeight: 700,
          color: "var(--v2-ink-950)",
          cursor: "pointer",
          paddingRight: 4,
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
