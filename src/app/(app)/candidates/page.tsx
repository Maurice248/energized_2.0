import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getSession } from "@/server/auth";
import { createCaller } from "@/server/api/root";
import { createContext } from "@/server/api/trpc";
import { SiteHeader } from "@/components/marketing/site-header";
import { CandidatesFilters } from "./candidates-filters";
import { SavedSearchesPanel } from "@/components/jobs/saved-searches-panel";

export const metadata: Metadata = { title: "Find candidates — Energized" };

const SECTORS_DISPLAY: Record<string, string> = {
  oil_gas: "Oil & gas",
  renewables: "Renewables",
  nuclear: "Nuclear",
  utilities: "Utilities",
  hydrogen: "Hydrogen",
  power: "Power",
  other: "Other",
};

const SETUP_DISPLAY: Record<string, string> = {
  on_site: "On-site",
  hybrid: "Hybrid",
  remote: "Remote",
  flexible: "Flexible",
};

type SearchParams = {
  q?: string;
  sector?: string;
  setup?: string;
  minYears?: string;
  openToWork?: string;
  page?: string;
};

const ALLOWED_SECTORS = [
  "oil_gas",
  "renewables",
  "nuclear",
  "utilities",
  "hydrogen",
  "power",
  "other",
] as const;
type SectorFilter = (typeof ALLOWED_SECTORS)[number];

const ALLOWED_SETUPS = ["on_site", "hybrid", "remote", "flexible"] as const;
type SetupFilter = (typeof ALLOWED_SETUPS)[number];

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getSession();
  if (!session) redirect("/sign-in?redirect=/candidates");
  if (session.user.role !== "employer") redirect("/dashboard");

  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const sector: SectorFilter | undefined =
    sp.sector && (ALLOWED_SECTORS as readonly string[]).includes(sp.sector)
      ? (sp.sector as SectorFilter)
      : undefined;
  const setup: SetupFilter | undefined =
    sp.setup && (ALLOWED_SETUPS as readonly string[]).includes(sp.setup)
      ? (sp.setup as SetupFilter)
      : undefined;
  const minYearsRaw = sp.minYears ? Number.parseInt(sp.minYears, 10) : NaN;
  const minYears =
    Number.isInteger(minYearsRaw) && minYearsRaw >= 0 ? minYearsRaw : undefined;
  const openToWork = sp.openToWork !== "0";
  const pageRaw = sp.page ? Number.parseInt(sp.page, 10) : 1;
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  const api = createCaller(await createContext());
  const data = await api.candidates.list({
    q: q || undefined,
    sector,
    setup,
    minYears,
    openToWork,
    page,
  });

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 md:py-10">
        <header className="mb-6">
          <h1 className="text-2xl font-black md:text-3xl">Find candidates</h1>
          <p className="text-sm text-muted-foreground">
            Browse the Energized talent pool — filtered by what actually
            matters in energy.
          </p>
        </header>

        <section className="mb-6">
          <CandidatesFilters
            initial={{
              q,
              sector: sector ?? "",
              setup: setup ?? "",
              minYears: minYears != null ? String(minYears) : "",
              openToWork,
            }}
          />
          <SavedSearchesPanel surface="candidates" />
        </section>

        <section className="mb-4 flex items-center justify-between">
          <p
            style={{
              fontSize: 13,
              color: "var(--v2-ink-500)",
              fontWeight: 600,
            }}
          >
            {data.total === 0
              ? "No candidates match these filters."
              : `${data.total} candidate${data.total === 1 ? "" : "s"}`}
          </p>
        </section>

        {data.candidates.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {data.candidates.map((c) => (
              <CandidateCard key={c.id} candidate={c} />
            ))}
          </div>
        )}

        {data.totalPages > 1 && (
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            searchParams={sp}
          />
        )}
      </main>
    </>
  );
}

function CandidateCard({
  candidate,
}: {
  candidate: {
    id: string;
    name: string | null;
    image: string | null;
    headline: string | null;
    location: string | null;
    sectors: string[];
    yearsExperience: number | null;
    remotePreference: string | null;
    openToWork: boolean;
    skills: string[];
  };
}) {
  const initial = (candidate.name?.trim()[0] ?? "?").toUpperCase();
  return (
    <Link
      href={`/p/${candidate.id}`}
      style={{
        display: "block",
        background: "white",
        border: "1px solid var(--v2-ink-200)",
        borderRadius: 16,
        padding: 20,
        transition: "border-color 150ms, box-shadow 150ms",
      }}
      className="hover:!border-[var(--v2-ink-400)] hover:shadow-sm"
    >
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: candidate.image ? "transparent" : "var(--v2-ink-950)",
            color: "var(--v2-accent)",
            display: "grid",
            placeItems: "center",
            fontFamily: "var(--v2-font-serif)",
            fontWeight: 900,
            fontSize: 18,
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          {candidate.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={candidate.image}
              alt={candidate.name ?? "candidate"}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            initial
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <h3
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "var(--v2-ink-950)",
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              {candidate.name ?? "Anonymous"}
            </h3>
            {candidate.openToWork && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: "var(--v2-accent-deep)",
                  background: "var(--v2-accent-soft)",
                  padding: "2px 8px",
                  borderRadius: 999,
                }}
              >
                Open to work
              </span>
            )}
          </div>
          {candidate.headline && (
            <p
              style={{
                fontSize: 14,
                color: "var(--v2-ink-700)",
                margin: "4px 0 0",
                lineHeight: 1.4,
              }}
            >
              {candidate.headline}
            </p>
          )}
          <div
            style={{
              marginTop: 10,
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              fontSize: 12,
              color: "var(--v2-ink-600)",
            }}
          >
            {candidate.location && <Meta>{candidate.location}</Meta>}
            {candidate.yearsExperience != null && (
              <Meta>{candidate.yearsExperience} yrs exp</Meta>
            )}
            {candidate.remotePreference && (
              <Meta>{SETUP_DISPLAY[candidate.remotePreference]}</Meta>
            )}
          </div>
          {candidate.sectors.length > 0 && (
            <div
              style={{
                marginTop: 10,
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
              }}
            >
              {candidate.sectors.slice(0, 4).map((s) => (
                <span
                  key={s}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--v2-ink-700)",
                    background: "var(--v2-ink-100)",
                    padding: "3px 8px",
                    borderRadius: 999,
                  }}
                >
                  {SECTORS_DISPLAY[s] ?? s}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

function Meta({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      {children}
    </span>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        background: "white",
        border: "1px dashed var(--v2-ink-300)",
        borderRadius: 16,
        padding: "48px 24px",
        textAlign: "center",
      }}
    >
      <p style={{ fontSize: 15, color: "var(--v2-ink-700)", margin: 0 }}>
        No candidates match these filters.
      </p>
      <p
        style={{
          fontSize: 13,
          color: "var(--v2-ink-500)",
          marginTop: 8,
        }}
      >
        Try widening the sector or experience filter.
      </p>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  searchParams,
}: {
  page: number;
  totalPages: number;
  searchParams: SearchParams;
}) {
  const buildHref = (next: number) => {
    const params = new URLSearchParams();
    if (searchParams.q) params.set("q", searchParams.q);
    if (searchParams.sector) params.set("sector", searchParams.sector);
    if (searchParams.setup) params.set("setup", searchParams.setup);
    if (searchParams.minYears) params.set("minYears", searchParams.minYears);
    if (searchParams.openToWork) params.set("openToWork", searchParams.openToWork);
    if (next > 1) params.set("page", String(next));
    const qs = params.toString();
    return qs ? `/candidates?${qs}` : "/candidates";
  };

  return (
    <nav
      style={{
        marginTop: 24,
        display: "flex",
        gap: 8,
        alignItems: "center",
        justifyContent: "center",
      }}
      aria-label="Pagination"
    >
      <Link
        href={buildHref(page - 1)}
        aria-disabled={page === 1}
        style={{
          padding: "6px 14px",
          borderRadius: 999,
          border: "1px solid var(--v2-ink-200)",
          color: page === 1 ? "var(--v2-ink-300)" : "var(--v2-ink-700)",
          fontSize: 13,
          fontWeight: 700,
          pointerEvents: page === 1 ? "none" : "auto",
          background: "white",
        }}
      >
        Previous
      </Link>
      <span style={{ fontSize: 13, color: "var(--v2-ink-500)" }}>
        Page {page} of {totalPages}
      </span>
      <Link
        href={buildHref(page + 1)}
        aria-disabled={page === totalPages}
        style={{
          padding: "6px 14px",
          borderRadius: 999,
          border: "1px solid var(--v2-ink-200)",
          color:
            page === totalPages ? "var(--v2-ink-300)" : "var(--v2-ink-700)",
          fontSize: 13,
          fontWeight: 700,
          pointerEvents: page === totalPages ? "none" : "auto",
          background: "white",
        }}
      >
        Next
      </Link>
    </nav>
  );
}
