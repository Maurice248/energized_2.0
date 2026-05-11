"use client";

export type Filters = {
  query: string;
  sectors: string[];
  durations: string[];
  sort: "popular" | "shortest" | "newest";
};

const SECTORS = [
  { id: "safety", label: "Safety" },
  { id: "tech", label: "Technical" },
  { id: "prof", label: "Professional" },
  { id: "soft", label: "Soft skills" },
  { id: "trans", label: "Transitions" },
];

const DURATIONS = [
  { id: "short", label: "<4h" },
  { id: "half", label: "4–8h" },
  { id: "day", label: "8–16h" },
  { id: "week", label: "1–2w" },
  { id: "long", label: "3w+" },
];

const SORTS = [
  { id: "popular", label: "Popular" },
  { id: "shortest", label: "Shortest" },
  { id: "newest", label: "Newest" },
] as const;

export function CatalogFilters({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
}) {
  const toggle = (key: "sectors" | "durations", id: string) => {
    const current = filters[key];
    const next = current.includes(id)
      ? current.filter((c) => c !== id)
      : [...current, id];
    onChange({ ...filters, [key]: next });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <FilterGroup
        label="Sector"
        options={SECTORS}
        active={filters.sectors}
        onToggle={(id) => toggle("sectors", id)}
      />
      <FilterGroup
        label="Length"
        options={DURATIONS}
        active={filters.durations}
        onToggle={(id) => toggle("durations", id)}
      />
      <div className="ml-auto inline-flex items-center gap-2 text-sm">
        <span className="text-slate-500">Sort:</span>
        <select
          value={filters.sort}
          onChange={(e) => onChange({ ...filters, sort: e.target.value as Filters["sort"] })}
          className="rounded-full border border-slate-300 bg-white py-1.5 pl-4 pr-9 text-sm font-medium text-slate-700"
        >
          {SORTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function FilterGroup({
  label,
  options,
  active,
  onToggle,
}: {
  label: string;
  options: { id: string; label: string }[];
  active: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      {options.map((o) => {
        const isOn = active.includes(o.id);
        return (
          <button
            key={o.id}
            onClick={() => onToggle(o.id)}
            className="rounded-full text-sm font-medium transition"
            style={{
              padding: "6px 12px",
              border: "1px solid " + (isOn ? "var(--brand-black, #101820)" : "#e2e8f0"),
              background: isOn ? "var(--brand-black, #101820)" : "#fff",
              color: isOn ? "#fff" : "#475569",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
