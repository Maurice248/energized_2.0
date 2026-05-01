"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/trpc/client";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/api/root";

type NotificationRow = inferRouterOutputs<AppRouter>["notifications"]["list"][number];

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
  const list = api.notifications.list.useQuery(
    { limit: 50 },
    { initialData: initial },
  );
  const utils = api.useUtils();
  const markRead = api.notifications.markRead.useMutation({
    onSuccess: () => {
      void utils.notifications.list.invalidate();
      void utils.notifications.unreadCount.invalidate();
    },
  });
  const markAllRead = api.notifications.markAllRead.useMutation({
    onSuccess: () => {
      void utils.notifications.list.invalidate();
      void utils.notifications.unreadCount.invalidate();
    },
  });

  const items = list.data ?? [];
  const unreadCount = items.filter((n) => !n.readAt).length;

  if (items.length === 0) {
    return (
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
        You&rsquo;re all caught up.
      </div>
    );
  }

  return (
    <>
      {unreadCount > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: 12,
          }}
        >
          <button
            type="button"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "var(--v2-accent-deep)",
              cursor: "pointer",
            }}
          >
            Mark all read
          </button>
        </div>
      )}
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
              padding: "14px 16px",
              background: n.readAt ? "white" : "var(--v2-accent-soft)",
              border: "1px solid var(--v2-ink-200)",
              borderRadius: 12,
              cursor: n.href ? "pointer" : "default",
            }}
          >
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
          </li>
        ))}
      </ul>
    </>
  );
}
