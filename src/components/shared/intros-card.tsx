"use client";

import { useState } from "react";
import { api } from "@/lib/trpc/client";

function relTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const ms = Date.now() - date.getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}

export function IntrosCard() {
  const utils = api.useUtils();
  const q = api.introRequests.inboxForMe.useQuery({ status: "pending" });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const accept = api.introRequests.acceptForMe.useMutation({
    onSuccess: () => void utils.introRequests.inboxForMe.invalidate({ status: "pending" }),
  });
  const decline = api.introRequests.declineForMe.useMutation({
    onSuccess: () => void utils.introRequests.inboxForMe.invalidate({ status: "pending" }),
  });

  return (
    <section
      id="intros"
      style={{
        background: "white",
        border: "1px solid var(--v2-ink-200)",
        borderRadius: "var(--v2-r-lg)",
        padding: 22,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h3
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 700,
            color: "var(--v2-ink-950)",
          }}
        >
          Intros
        </h3>
        {q.data && q.data.length > 0 && (
          <span
            style={{
              fontSize: 11,
              padding: "2px 8px",
              borderRadius: 999,
              background: "#1CAAE2",
              color: "white",
              fontWeight: 700,
            }}
          >
            {q.data.length}
          </span>
        )}
      </header>

      {q.isLoading && (
        <div style={{ fontSize: 13, color: "var(--v2-ink-700)" }}>Loading…</div>
      )}

      {q.data && q.data.length === 0 && (
        <div style={{ fontSize: 13, color: "var(--v2-ink-700)" }}>
          No intro requests yet.
        </div>
      )}

      {q.data?.map((r) => (
        <div
          key={r.id}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            padding: 12,
            background: "var(--v2-ink-50)",
            borderRadius: 10,
          }}
        >
          <div
            style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
            onClick={() => setExpandedId((x) => (x === r.id ? null : r.id))}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: r.org.logoUrl
                  ? `url(${r.org.logoUrl}) center/cover`
                  : "#e5edf5",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#004984",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              {!r.org.logoUrl && r.org.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--v2-ink-950)" }}>
                {r.org.name}
              </div>
              <div style={{ fontSize: 11, color: "var(--v2-ink-700)" }}>
                {r.requestedBy?.name ?? "Someone"} · {relTime(r.createdAt)}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  decline.mutate({ id: r.id });
                }}
                disabled={decline.isPending}
                className="v2-btn v2-btn-ghost v2-btn-sm"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  accept.mutate({ id: r.id });
                }}
                disabled={accept.isPending}
                className="v2-btn v2-btn-sm"
              >
                Accept
              </button>
            </div>
          </div>
          {expandedId === r.id && r.message && (
            <div
              style={{
                background: "white",
                borderRadius: 8,
                padding: 10,
                fontSize: 13,
                color: "var(--v2-ink-700)",
                fontStyle: "italic",
              }}
            >
              {r.message}
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
