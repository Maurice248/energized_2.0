"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight } from "lucide-react";
import posthog from "posthog-js";
import { sanitizeCmsHtml } from "@/lib/sanitize-cms-html";

type Sector = {
  slug: string;
  name: string;
  roles: { slug: string; name: string }[];
};

export function CatalogHero({
  sectors,
  isEmployer,
  cmsJobseekerHeroHtml,
  cmsEmployerHeroHtml,
}: {
  sectors: Sector[];
  isEmployer: boolean;
  cmsJobseekerHeroHtml: string | null;
  cmsEmployerHeroHtml: string | null;
}) {
  const [text, setText] = useState("");
  const router = useRouter();

  useEffect(() => {
    try {
      posthog.capture("skill_test.catalog.viewed", {
        totalSectors: sectors.length,
        isEmployer,
      });
    } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = () => {
    if (!text.trim()) return;
    const lower = text.toLowerCase();
    const matchedRole = sectors
      .flatMap((s) => s.roles.map((r) => ({ ...r, sectorSlug: s.slug })))
      .find((r) => r.name.toLowerCase().includes(lower));
    if (matchedRole) {
      router.push(`/skills/${matchedRole.slug}/configure`);
      return;
    }
    const matchedSector = sectors.find((s) => s.name.toLowerCase().includes(lower));
    router.push(`/skills/${(matchedSector ?? sectors[0]).slug}/configure`);
  };

  const suggestions = ["Wind technician II", "Reservoir engineer", "Hydrogen process eng.", "Grid system operator"];

  return (
    <div className="grid gap-14 border-b border-slate-200 pb-12 lg:grid-cols-[1.4fr_1fr] lg:items-end">
      <div>
        {isEmployer && cmsEmployerHeroHtml ? (
          <div
            dangerouslySetInnerHTML={{
              __html: sanitizeCmsHtml(cmsEmployerHeroHtml),
            }}
          />
        ) : !isEmployer && cmsJobseekerHeroHtml ? (
          <div
            dangerouslySetInnerHTML={{
              __html: sanitizeCmsHtml(cmsJobseekerHeroHtml),
            }}
          />
        ) : (
          <>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              {isEmployer ? "Skill assessments · proof of talent" : "Skill assessments"}
            </div>
            <h1 className="mt-6 text-5xl font-bold leading-[0.95] tracking-tight md:text-7xl lg:text-8xl">
              {isEmployer ? (
                <>
                  Hire <em className="not-italic font-bold italic text-[var(--brand-dark-blue)]">verified</em>.<br />
                  Not self-claimed.
                </>
              ) : (
                <>
                  Get <em className="not-italic font-bold italic text-[var(--brand-dark-blue)]">verified</em>.<br />
                  One sitting. 25 minutes.
                </>
              )}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
              {isEmployer
                ? "Every candidate on Energized can prove what they know — same AI-built test, real scenarios, sector-specific. Filter by badge and shortlist with confidence."
                : "AI builds a fresh test for your sector and role — multiple choice, real scenarios, calcs. Pass and a badge lands on your profile that recruiters can filter by."}
            </p>
          </>
        )}
        <div className="mt-8 flex flex-wrap gap-9">
          <Stat v={String(sectors.length)} l="Sectors covered" />
          <Stat v="Fresh" l="Test built each attempt — no two alike" />
          <Stat v="3.4×" l="Recruiter response rate vs. unverified" />
        </div>
      </div>

      {isEmployer ? (
        <EmployerPanel />
      ) : (
      <div className="relative overflow-hidden rounded-3xl bg-[var(--brand-black)] p-7 text-white">
        <div className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(28,170,226,0.25),transparent_70%)]" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--brand-blue)]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--brand-blue)]" />
            AI generator · live
          </div>
          <h3
            className="mt-3 text-4xl font-bold tracking-tight"
            style={{ color: "#fff" }}
          >
            Just tell us the{" "}
            <em
              className="not-italic italic"
              style={{ color: "var(--brand-blue, #1CAAE2)" }}
            >
              job
            </em>
            .
          </h3>
          <p
            className="mt-3 text-base leading-7"
            style={{ color: "rgba(255,255,255,0.85)" }}
          >
            Type your role or paste a job description. The generator picks the
            sector, level and question mix.
          </p>
          <div className="mt-5 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1.5 pl-5 pr-1.5">
            <Sparkles className="h-4 w-4 text-[var(--brand-blue)]" />
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="e.g. Wind technician II, GWO certified"
              className="min-w-0 flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-slate-500"
            />
            <button
              onClick={submit}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-blue)] px-4 py-2.5 text-xs font-bold text-[var(--brand-black)] transition hover:bg-[var(--brand-dark-blue)] hover:text-white"
            >
              Build test <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => setText(s)}
                className="rounded-full text-sm font-medium transition hover:text-[var(--brand-blue)]"
                style={{
                  border: "1px solid rgba(255,255,255,0.45)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#fff",
                  padding: "5px 10px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--brand-blue, #1CAAE2)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.45)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

function EmployerPanel() {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-[var(--brand-black)] p-7 text-white">
      <div className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(28,170,226,0.25),transparent_70%)]" />
      <div className="relative">
        <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--brand-blue)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-blue)]" />
          Find verified candidates
        </div>
        <h3
          className="mt-3 text-4xl font-bold tracking-tight"
          style={{ color: "#fff" }}
        >
          This is what your future hires{" "}
          <em
            className="not-italic italic"
            style={{ color: "var(--brand-blue, #1CAAE2)" }}
          >
            prove
          </em>
          .
        </h3>
        <p
          className="mt-3 text-base leading-7"
          style={{ color: "rgba(255,255,255,0.85)" }}
        >
          Pick a sector below to see candidates who have earned the badge — or jump straight to the talent pool.
        </p>
        <Link
          href="/candidates"
          className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-blue)] px-5 py-2.5 text-sm font-bold text-[var(--brand-black)] transition hover:bg-[var(--brand-dark-blue)] hover:text-white"
        >
          Browse candidates <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function Stat({ v, l }: { v: string; l: string }) {
  return (
    <div>
      <div className="text-4xl font-bold italic tracking-tight text-[var(--brand-dark-blue)]">{v}</div>
      <div className="mt-2 max-w-[160px] text-[11px] font-bold uppercase leading-relaxed tracking-[0.16em] text-slate-500">
        {l}
      </div>
    </div>
  );
}
