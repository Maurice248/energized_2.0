"use client";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { TrainingCard, type CardTraining } from "./training-card";
import { CatalogFilters, type Filters } from "./catalog-filters";

export function CatalogClient({
  initialTrainings,
  isEmployer,
}: {
  initialTrainings: CardTraining[];
  isEmployer: boolean;
}) {
  const [filters, setFilters] = useState<Filters>({
    query: "",
    sectors: [],
    durations: [],
    sort: "popular",
  });

  const visible = useMemo(() => {
    let arr = [...initialTrainings];

    if (filters.query.trim()) {
      const needle = filters.query.toLowerCase();
      arr = arr.filter((t) =>
        [t.title, t.shortBlurb, t.sector].join(" ").toLowerCase().includes(needle),
      );
    }

    if (filters.sectors.length > 0) {
      arr = arr.filter((t) => filters.sectors.includes(t.sector));
    }

    if (filters.durations.length > 0) {
      arr = arr.filter((t) => {
        if (filters.durations.includes("short") && t.hours < 4) return true;
        if (filters.durations.includes("half") && t.hours >= 4 && t.hours <= 8) return true;
        if (filters.durations.includes("day") && t.hours > 8 && t.hours <= 16) return true;
        if (filters.durations.includes("week") && t.hours > 16 && t.hours <= 80) return true;
        if (filters.durations.includes("long") && t.hours > 80) return true;
        return false;
      });
    }

    if (filters.sort === "shortest") arr.sort((a, b) => a.hours - b.hours);
    else if (filters.sort === "newest")
      arr.sort((a, b) => Number(b.isNew) - Number(a.isNew));
    return arr;
  }, [initialTrainings, filters]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
        <div className="flex flex-1 items-center gap-2 px-2">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={filters.query}
            onChange={(e) => setFilters({ ...filters, query: e.target.value })}
            placeholder="Try 'GWO', 'PLC programming', 'oil to renewables'…"
            className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
        </div>
      </div>
      <CatalogFilters filters={filters} onChange={setFilters} />
      <div className="mb-4 mt-6 text-sm text-slate-600">
        {visible.length} {visible.length === 1 ? "training" : "trainings"}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {visible.map((t) => (
          <TrainingCard key={t.slug} training={t} isEmployer={isEmployer} />
        ))}
      </div>
    </div>
  );
}
