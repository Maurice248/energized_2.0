"use client";

import Link from "next/link";
import type { inferRouterOutputs } from "@trpc/server";
import { Icon } from "@/components/shared/icon";
import { api } from "@/lib/trpc/client";
import type { AppRouter } from "@/server/api/root";

type ShortlistRow = inferRouterOutputs<AppRouter>["savedCandidates"]["list"][number];

const SECTORS_DISPLAY: Record<string, string> = {
  oil_gas: "Oil & gas",
  renewables: "Renewables",
  nuclear: "Nuclear",
  utilities: "Utilities",
  hydrogen: "Hydrogen",
  power: "Power",
  other: "Other",
};

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

export function ShortlistClient({ initial }: { initial: ShortlistRow[] }) {
  const list = api.savedCandidates.list.useQuery(undefined, {
    initialData: initial,
  });
  const utils = api.useUtils();
  const remove = api.savedCandidates.remove.useMutation({
    onSuccess: () => {
      void utils.savedCandidates.list.invalidate();
    },
  });

  const items = list.data ?? [];

  if (items.length === 0) {
    return (
      <div
        style={{
          padding: "48px 24px",
          textAlign: "center",
          background: "white",
          border: "1px dashed var(--v2-ink-300)",
          borderRadius: 16,
        }}
      >
        <p style={{ fontSize: 15, color: "var(--v2-ink-700)", margin: 0 }}>
          No one shortlisted yet.
        </p>
        <p
          style={{
            fontSize: 13,
            color: "var(--v2-ink-500)",
            marginTop: 8,
          }}
        >
          Browse candidates and click <em>Save to shortlist</em> on any profile.
        </p>
        <Link
          href="/candidates"
          className="v2-btn v2-btn-primary v2-btn-sm"
          style={{ marginTop: 16, display: "inline-flex" }}
        >
          Find candidates
        </Link>
      </div>
    );
  }

  return (
    <ul
      style={{
        listStyle: "none",
        padding: 0,
        margin: 0,
        display: "grid",
        gap: 12,
      }}
    >
      {items.map((c) => {
        const initial = (c.candidateName?.trim()[0] ?? "?").toUpperCase();
        return (
          <li
            key={c.id}
            style={{
              background: "white",
              border: "1px solid var(--v2-ink-200)",
              borderRadius: 16,
              padding: 18,
              display: "flex",
              gap: 14,
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: c.candidateImage
                  ? "transparent"
                  : "var(--v2-ink-950)",
                color: "var(--v2-accent)",
                display: "grid",
                placeItems: "center",
                fontFamily: "var(--v2-font-serif)",
                fontWeight: 900,
                fontSize: 16,
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              {c.candidateImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.candidateImage}
                  alt={c.candidateName ?? "candidate"}
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
                <Link
                  href={`/p/${c.candidateId}`}
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "var(--v2-ink-950)",
                    textDecoration: "none",
                  }}
                >
                  {c.candidateName ?? "Anonymous"}
                </Link>
                {c.openToWork && (
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
              {c.headline && (
                <p
                  style={{
                    fontSize: 14,
                    color: "var(--v2-ink-700)",
                    margin: "4px 0 0",
                    lineHeight: 1.4,
                  }}
                >
                  {c.headline}
                </p>
              )}
              <div
                style={{
                  marginTop: 8,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 12,
                  fontSize: 12,
                  color: "var(--v2-ink-500)",
                }}
              >
                {c.location && <span>{c.location}</span>}
                {c.yearsExperience != null && (
                  <span>{c.yearsExperience} yrs exp</span>
                )}
                {c.sectors.length > 0 && (
                  <span>
                    {c.sectors.slice(0, 3).map((s) => SECTORS_DISPLAY[s] ?? s).join(", ")}
                  </span>
                )}
              </div>
              {c.note && (
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--v2-ink-700)",
                    background: "var(--v2-ink-50)",
                    padding: "8px 12px",
                    borderRadius: 8,
                    marginTop: 10,
                  }}
                >
                  {c.note}
                </p>
              )}
              <div
                style={{
                  fontSize: 11,
                  color: "var(--v2-ink-500)",
                  marginTop: 8,
                }}
              >
                Added by{" "}
                <strong>
                  {c.savedByName ?? c.savedByEmail ?? "a teammate"}
                </strong>{" "}
                · {timeAgo(c.createdAt)}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <Link
                href={`/p/${c.candidateId}`}
                className="v2-btn v2-btn-ghost v2-btn-sm"
              >
                View
              </Link>
              <button
                type="button"
                onClick={() => {
                  if (
                    !window.confirm(
                      `Remove ${c.candidateName ?? "this candidate"} from the shortlist?`,
                    )
                  )
                    return;
                  remove.mutate({ candidateId: c.candidateId });
                }}
                disabled={remove.isPending}
                aria-label="Remove from shortlist"
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
            </div>
          </li>
        );
      })}
    </ul>
  );
}
