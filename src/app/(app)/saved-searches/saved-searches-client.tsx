"use client";

import Link from "next/link";
import type { inferRouterOutputs } from "@trpc/server";
import { Icon } from "@/components/shared/icon";
import { api } from "@/lib/trpc/client";
import type { AppRouter } from "@/server/api/root";

type SearchRow = inferRouterOutputs<AppRouter>["savedSearches"]["list"][number];

const PATHS = {
  jobs: "/jobs",
  candidates: "/candidates",
} as const;

const TITLES = {
  jobs: "Job searches",
  candidates: "Candidate searches",
} as const;

const SUBTITLES = {
  jobs: "Saved on /jobs",
  candidates: "Saved on /candidates",
} as const;

function timeAgo(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  const diff = Math.max(0, Date.now() - date.getTime());
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return date.toLocaleDateString();
}

export function SavedSearchesClient({
  jobs,
  candidates,
  isEmployer,
}: {
  jobs: SearchRow[];
  candidates: SearchRow[];
  isEmployer: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <Section
        surface="jobs"
        initial={jobs}
        emptyHint={
          <>
            Apply filters on{" "}
            <Link href="/jobs" style={{ color: "var(--v2-accent-deep)" }}>
              /jobs
            </Link>{" "}
            and click <em>Save this search</em>.
          </>
        }
      />
      {isEmployer && (
        <Section
          surface="candidates"
          initial={candidates}
          emptyHint={
            <>
              Apply filters on{" "}
              <Link
                href="/candidates"
                style={{ color: "var(--v2-accent-deep)" }}
              >
                /candidates
              </Link>{" "}
              and click <em>Save this search</em>.
            </>
          }
        />
      )}
    </div>
  );
}

function Section({
  surface,
  initial,
  emptyHint,
}: {
  surface: "jobs" | "candidates";
  initial: SearchRow[];
  emptyHint: React.ReactNode;
}) {
  const list = api.savedSearches.list.useQuery(
    { surface },
    { initialData: initial },
  );
  const utils = api.useUtils();
  const remove = api.savedSearches.delete.useMutation({
    onSuccess: () => {
      void utils.savedSearches.list.invalidate({ surface });
    },
  });

  const items = list.data ?? [];

  return (
    <section
      style={{
        background: "white",
        border: "1px solid var(--v2-ink-200)",
        borderRadius: "var(--v2-r-lg)",
        padding: 22,
      }}
    >
      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "var(--v2-ink-950)",
          }}
        >
          {TITLES[surface]}
        </div>
        <div
          style={{
            fontSize: 12,
            color: "var(--v2-ink-500)",
            marginTop: 2,
          }}
        >
          {SUBTITLES[surface]} ·{" "}
          {items.length === 0
            ? "none yet"
            : `${items.length} saved`}
        </div>
      </div>

      {items.length === 0 ? (
        <div
          style={{
            padding: "16px",
            background: "var(--v2-ink-50)",
            border: "1px dashed var(--v2-ink-200)",
            borderRadius: 12,
            fontSize: 13,
            color: "var(--v2-ink-600)",
          }}
        >
          {emptyHint}
        </div>
      ) : (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {items.map((s) => (
            <li
              key={s.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 14px",
                border: "1px solid var(--v2-ink-200)",
                borderRadius: 12,
                background: "white",
              }}
            >
              <Link
                href={
                  s.queryString
                    ? `${PATHS[surface]}?${s.queryString}`
                    : PATHS[surface]
                }
                style={{
                  flex: 1,
                  minWidth: 0,
                  textDecoration: "none",
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "var(--v2-ink-950)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {s.name}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--v2-ink-500)",
                    fontFamily: "var(--v2-font-mono)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    marginTop: 2,
                  }}
                >
                  {s.queryString || "(no filters)"} · saved{" "}
                  {timeAgo(s.createdAt)}
                </div>
              </Link>
              <Link
                href={
                  s.queryString
                    ? `${PATHS[surface]}?${s.queryString}`
                    : PATHS[surface]
                }
                className="v2-btn v2-btn-ghost v2-btn-sm"
              >
                Run
              </Link>
              <button
                type="button"
                onClick={() => {
                  if (!window.confirm(`Delete the saved search "${s.name}"?`))
                    return;
                  remove.mutate({ id: s.id });
                }}
                disabled={remove.isPending}
                aria-label="Delete saved search"
                style={{
                  padding: "6px 10px",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--v2-ink-500)",
                  background: "transparent",
                  border: "1px solid var(--v2-ink-200)",
                  borderRadius: 999,
                  cursor: remove.isPending ? "default" : "pointer",
                }}
              >
                <Icon name="x" size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
