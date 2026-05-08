"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

type Sector = {
  slug: string;
  name: string;
  monogram: string;
  blurb: string | null;
  tileColor: string;
  isHot: boolean;
  roles: unknown[];
};

const TABS = [
  { id: "all", l: "All" },
  { id: "hot", l: "Trending" },
  { id: "renewable", l: "Renewable" },
  { id: "traditional", l: "Traditional" },
] as const;

const RENEWABLE = new Set(["wind", "solar", "geo", "hydrogen", "battery"]);
const TRADITIONAL = new Set(["oilgas", "grid", "nuclear", "ccus"]);

export function SectorGrid({ sectors }: { sectors: Sector[] }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("all");
  const filtered =
    tab === "all"
      ? sectors
      : tab === "hot"
        ? sectors.filter((s) => s.isHot)
        : tab === "renewable"
          ? sectors.filter((s) => RENEWABLE.has(s.slug))
          : sectors.filter((s) => TRADITIONAL.has(s.slug));

  return (
    <>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-6">
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
          Pick your <em className="not-italic italic text-[var(--brand-dark-blue)]">sector</em>.<br />
          We&apos;ll build the test.
        </h2>
        <div className="inline-flex gap-0.5 rounded-full border border-slate-200 bg-white p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-full px-3.5 py-2 text-xs font-bold transition ${
                tab === t.id
                  ? "bg-[var(--brand-black)] text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {t.l}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((s) => (
          <Link
            key={s.slug}
            href={`/skills/${s.slug}/configure`}
            className="group relative overflow-hidden rounded-2xl border-2 border-slate-300 bg-white p-6 text-left transition hover:-translate-y-0.5 hover:border-[var(--brand-black)] hover:shadow-xl"
          >
            {s.isHot && (
              <span className="absolute left-6 top-6 rounded-full bg-[var(--brand-blue)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--brand-black)]">
                Hot ↑
              </span>
            )}
            <div className="absolute right-6 top-6 grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-500 transition group-hover:border-[var(--brand-blue)] group-hover:bg-[var(--brand-blue)] group-hover:text-[var(--brand-black)] group-hover:[transform:rotate(-45deg)]">
              <ArrowRight className="h-4 w-4" />
            </div>
            <div
              className="relative mb-7 grid h-14 w-14 place-items-center rounded-2xl text-xl font-bold text-white"
              style={{ background: s.tileColor }}
            >
              {s.monogram}
              <span className="absolute -right-1.5 -top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[var(--brand-blue)]" />
            </div>
            <h3 className="text-2xl font-bold tracking-tight">{s.name}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.blurb}</p>
            <div className="mt-5 flex items-center justify-between border-t border-dashed border-slate-200 pt-4 text-sm">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">Roles</div>
                <div className="text-xl font-bold tracking-tight">{s.roles.length}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
