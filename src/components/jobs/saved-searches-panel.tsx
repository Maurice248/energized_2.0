"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/shared/icon";
import { api } from "@/lib/trpc/client";

type Surface = "jobs" | "candidates";

const PATHS: Record<Surface, string> = {
  jobs: "/jobs",
  candidates: "/candidates",
};

export function SavedSearchesPanel({ surface }: { surface: Surface }) {
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [showInput, setShowInput] = useState(false);
  const utils = api.useUtils();

  const list = api.savedSearches.list.useQuery(
    { surface },
    { retry: false, refetchOnWindowFocus: false },
  );

  const save = api.savedSearches.save.useMutation({
    onSuccess: () => {
      setName("");
      setShowInput(false);
      void utils.savedSearches.list.invalidate({ surface });
    },
  });

  const remove = api.savedSearches.delete.useMutation({
    onSuccess: () => {
      void utils.savedSearches.list.invalidate({ surface });
    },
  });

  // Hide panel for anonymous users (list errors with UNAUTHORIZED)
  if (list.error) return null;

  const currentQs = searchParams.toString();
  const hasFilters = currentQs.length > 0;
  const items = list.data ?? [];

  if (!hasFilters && items.length === 0) return null;

  return (
    <div
      style={{
        marginTop: 16,
        padding: 14,
        background: "var(--v2-ink-50)",
        border: "1px solid var(--v2-ink-200)",
        borderRadius: 14,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--v2-ink-500)",
          marginBottom: 10,
        }}
      >
        Saved searches
      </div>

      {items.length > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            marginBottom: hasFilters ? 12 : 0,
          }}
        >
          {items.map((s) => (
            <div
              key={s.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 4px 6px 10px",
                background: "white",
                border: "1px solid var(--v2-ink-200)",
                borderRadius: 999,
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
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--v2-ink-900)",
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {s.name}
              </Link>
              <button
                type="button"
                onClick={() => remove.mutate({ id: s.id })}
                disabled={remove.isPending}
                aria-label={`Delete ${s.name}`}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  color: "var(--v2-ink-500)",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <Icon name="x" size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {hasFilters && (
        <div>
          {showInput ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!name.trim()) return;
                save.mutate({
                  surface,
                  name: name.trim(),
                  queryString: currentQs,
                });
              }}
              style={{ display: "flex", gap: 6 }}
            >
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name this search…"
                maxLength={60}
                style={{
                  flex: 1,
                  fontSize: 13,
                  padding: "6px 12px",
                  background: "white",
                  border: "1px solid var(--v2-ink-200)",
                  borderRadius: 999,
                  outline: "none",
                  minWidth: 0,
                }}
              />
              <button
                type="submit"
                disabled={save.isPending || !name.trim()}
                className="v2-btn v2-btn-primary v2-btn-sm"
                style={{ flexShrink: 0 }}
              >
                {save.isPending ? "…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowInput(false);
                  setName("");
                }}
                style={{
                  fontSize: 13,
                  color: "var(--v2-ink-500)",
                  cursor: "pointer",
                  padding: "0 8px",
                }}
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowInput(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                fontWeight: 700,
                color: "var(--v2-accent-deep)",
                cursor: "pointer",
                padding: "4px 0",
              }}
            >
              <Icon name="plus" size={14} />
              Save this search
            </button>
          )}
          {save.error && (
            <div
              role="alert"
              style={{
                marginTop: 6,
                fontSize: 12,
                color: "#A63A20",
              }}
            >
              {save.error.message}
            </div>
          )}
        </div>
      )}

      {!hasFilters && items.length > 0 && (
        <div
          style={{
            fontSize: 11,
            color: "var(--v2-ink-500)",
            marginTop: 8,
          }}
        >
          Click a search to re-run it. Apply filters to save a new one.
        </div>
      )}
    </div>
  );
}

