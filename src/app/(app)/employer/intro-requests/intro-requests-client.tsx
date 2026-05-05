"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/trpc/client";
import { IntroContactPanel } from "@/components/profile/intro-contact-panel";

type Tab = "pending" | "accepted" | "declined" | "all";
const TABS: { value: Tab; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
  { value: "all", label: "All" },
];

export function IntroRequestsClient() {
  const params = useSearchParams();
  const focusId = params.get("focus");
  const [tab, setTab] = useState<Tab>(focusId ? "all" : "pending");
  const [expandedId, setExpandedId] = useState<string | null>(focusId);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  const utils = api.useUtils();
  const list = api.introRequests.listForOrg.useQuery({ status: tab, limit: 100 });
  const cancel = api.introRequests.cancel.useMutation({
    onMutate: ({ id }) => setCancelingId(id),
    onSettled: () => setCancelingId(null),
    onSuccess: () => void utils.introRequests.listForOrg.invalidate(),
  });

  const focusedRow = useMemo(
    () => list.data?.find((r) => r.id === focusId),
    [list.data, focusId],
  );

  useEffect(() => {
    if (!focusId || !focusedRow) return;
    const expectedTab: Tab =
      focusedRow.status === "pending" ? "pending"
      : focusedRow.status === "accepted" ? "accepted"
      : focusedRow.status === "declined" ? "declined"
      : "all";
    if (expectedTab !== tab) setTab(expectedTab);
    setExpandedId(focusId);
    const el = document.getElementById(`intro-row-${focusId}`);
    if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [focusId, focusedRow, tab]);

  return (
    <main style={{ maxWidth: 960, margin: "32px auto", padding: "0 24px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 900, color: "#101820", marginBottom: 8 }}>
        Intro requests
      </h1>
      <p style={{ color: "var(--v2-ink-700)", marginBottom: 16 }}>
        Requests your team has sent from candidate profiles.
      </p>

      <nav style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={tab === t.value ? "v2-btn v2-btn-sm" : "v2-btn v2-btn-ghost v2-btn-sm"}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {list.isLoading && <div>Loading&hellip;</div>}
      {list.data && list.data.length === 0 && (
        <div style={{ color: "var(--v2-ink-700)" }}>
          No requests in this view.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {list.data?.map((r) => (
          <div
            key={r.id}
            id={`intro-row-${r.id}`}
            style={{
              background: "white",
              border: "1px solid var(--v2-ink-200)",
              borderRadius: "var(--v2-r-lg)",
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
              onClick={() => setExpandedId((x) => (x === r.id ? null : r.id))}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 999,
                  background: r.candidate.image
                    ? `url(${r.candidate.image}) center/cover`
                    : "#e5edf5",
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <Link
                  href={`/p/${r.candidate.id}`}
                  style={{ fontSize: 15, fontWeight: 700, color: "#101820", textDecoration: "none" }}
                >
                  {r.candidate.name ?? "Candidate"}
                </Link>
                <div style={{ fontSize: 12, color: "var(--v2-ink-700)" }}>
                  {r.candidate.headline ?? ""}
                  {r.candidate.location ? ` · ${r.candidate.location}` : ""}
                </div>
              </div>
              <span
                style={{
                  fontSize: 11,
                  padding: "3px 8px",
                  borderRadius: 999,
                  background:
                    r.status === "accepted" ? "#dcfce7" :
                    r.status === "declined" ? "#fee2e2" :
                    r.status === "canceled" ? "#f3f4f6" :
                    "#dbeafe",
                  color:
                    r.status === "accepted" ? "#166534" :
                    r.status === "declined" ? "#991b1b" :
                    r.status === "canceled" ? "#374151" :
                    "#1e40af",
                  fontWeight: 700,
                  textTransform: "capitalize",
                }}
              >
                {r.status}
              </span>
            </div>

            {expandedId === r.id && (
              <>
                {r.message && (
                  <div
                    style={{
                      background: "var(--v2-ink-50)",
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 13,
                      fontStyle: "italic",
                      color: "var(--v2-ink-700)",
                    }}
                  >
                    {r.message}
                  </div>
                )}
                <div style={{ fontSize: 12, color: "var(--v2-ink-700)" }}>
                  Sent by {r.requestedBy?.name ?? "a former teammate"} on{" "}
                  {new Date(r.createdAt).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })}
                </div>
                {r.status === "pending" && (
                  <button
                    type="button"
                    onClick={() => cancel.mutate({ id: r.id })}
                    disabled={cancelingId === r.id}
                    className="v2-btn v2-btn-ghost v2-btn-sm"
                    style={{ alignSelf: "flex-start" }}
                  >
                    Cancel request
                  </button>
                )}
                {r.status === "accepted" && (
                  <IntroContactPanel candidateUserId={r.candidate.id} />
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
