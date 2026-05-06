"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/trpc/client";
import { Icon } from "@/components/shared/icon";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/api/root";

type NotificationRow = inferRouterOutputs<AppRouter>["notifications"]["list"][number];
type Filter = "all" | "unread" | "read";

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

export function NotificationsList({ initial }: { initial: NotificationRow[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");

  const list = api.notifications.list.useQuery(
    { limit: 50 },
    { initialData: initial },
  );
  const utils = api.useUtils();
  const invalidate = () => {
    void utils.notifications.list.invalidate();
    void utils.notifications.unreadCount.invalidate();
  };
  const markRead = api.notifications.markRead.useMutation({ onSuccess: invalidate });
  const markUnread = api.notifications.markUnread.useMutation({ onSuccess: invalidate });
  const markAllRead = api.notifications.markAllRead.useMutation({ onSuccess: invalidate });
  const remove = api.notifications.delete.useMutation({
    onSuccess: () => {
      invalidate();
      setPendingDelete(null);
    },
  });

  const [pendingDelete, setPendingDelete] = useState<NotificationRow | null>(
    null,
  );

  const all = list.data ?? [];
  const unreadCount = all.filter((n) => !n.readAt).length;
  const readCount = all.length - unreadCount;
  const items =
    filter === "unread"
      ? all.filter((n) => !n.readAt)
      : filter === "read"
        ? all.filter((n) => n.readAt)
        : all;

  const tabs: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "All", count: all.length },
    { key: "unread", label: "Unread", count: unreadCount },
    { key: "read", label: "Read", count: readCount },
  ];

  return (
    <>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div role="tablist" aria-label="Filter notifications" style={{ display: "flex", gap: 6 }}>
          {tabs.map((t) => {
            const active = filter === t.key;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(t.key)}
                style={{
                  padding: "6px 12px",
                  fontSize: 13,
                  fontWeight: 700,
                  borderRadius: 999,
                  border: `1px solid ${active ? "var(--v2-ink-950)" : "var(--v2-ink-200)"}`,
                  background: active ? "var(--v2-ink-950)" : "white",
                  color: active ? "white" : "var(--v2-ink-700)",
                  cursor: "pointer",
                }}
              >
                {t.label}
                <span
                  style={{
                    marginLeft: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    color: active ? "rgba(255,255,255,0.75)" : "var(--v2-ink-500)",
                  }}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="v2-btn v2-btn-ghost v2-btn-sm"
          >
            {markAllRead.isPending ? "Marking…" : "Mark all read"}
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div
          style={{
            padding: "48px 24px",
            textAlign: "center",
            background: "white",
            border: "1px dashed var(--v2-ink-300)",
            borderRadius: 16,
            color: "var(--v2-ink-500)",
          }}
        >
          {filter === "unread"
            ? "No unread notifications."
            : filter === "read"
              ? "No read notifications yet."
              : "You’re all caught up."}
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
          {items.map((n) => (
            <li
              key={n.id}
              onClick={() => {
                if (!n.readAt) markRead.mutate({ id: n.id });
                if (n.href) router.push(n.href);
              }}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                padding: "14px 16px",
                background: n.readAt ? "white" : "var(--v2-accent-soft)",
                border: "1px solid var(--v2-ink-200)",
                borderRadius: 12,
                cursor: n.href ? "pointer" : "default",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "var(--v2-ink-950)",
                    }}
                  >
                    {n.title}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--v2-ink-500)",
                      flexShrink: 0,
                    }}
                  >
                    {timeAgo(n.createdAt)}
                  </div>
                </div>
                {n.body && (
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--v2-ink-600)",
                      marginTop: 4,
                      lineHeight: 1.4,
                    }}
                  >
                    {n.body}
                  </div>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  flexShrink: 0,
                  gap: 6,
                  alignItems: "center",
                }}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (n.readAt) {
                      markUnread.mutate({ id: n.id });
                    } else {
                      markRead.mutate({ id: n.id });
                    }
                  }}
                  disabled={markRead.isPending || markUnread.isPending}
                  aria-label={
                    n.readAt ? "Mark as unread" : "Mark as read"
                  }
                  title={n.readAt ? "Mark as unread" : "Mark as read"}
                  style={{
                    width: 28,
                    height: 28,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: 999,
                    border: "1px solid var(--v2-ink-200)",
                    background: "white",
                    color: "var(--v2-ink-500)",
                    cursor: "pointer",
                  }}
                >
                  <Icon
                    name={n.readAt ? "eyeOff" : "check"}
                    size={12}
                  />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPendingDelete(n);
                  }}
                  disabled={remove.isPending}
                  aria-label="Delete notification"
                  title="Delete notification"
                  style={{
                    width: 28,
                    height: 28,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: 999,
                    border: "1px solid var(--v2-ink-200)",
                    background: "white",
                    color: "var(--v2-ink-500)",
                    cursor: remove.isPending ? "default" : "pointer",
                  }}
                >
                  <Icon name="x" size={12} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={Boolean(pendingDelete)}
        onOpenChange={(o) => {
          if (!o && !remove.isPending) setPendingDelete(null);
        }}
      >
        <DialogContent className="v2 sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle style={{ fontStyle: "italic", fontSize: 22 }}>
              Delete this notification?
            </DialogTitle>
            <DialogDescription>
              {pendingDelete?.title ?? ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              className="v2-btn v2-btn-ghost v2-btn-sm"
              onClick={() => setPendingDelete(null)}
              disabled={remove.isPending}
            >
              Cancel
            </button>
            <button
              type="button"
              className="v2-btn v2-btn-primary v2-btn-sm"
              onClick={() => {
                if (pendingDelete) remove.mutate({ id: pendingDelete.id });
              }}
              disabled={remove.isPending}
            >
              {remove.isPending ? "Deleting…" : "Delete"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
