"use client";

import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/lib/trpc/client";
import { Icon } from "@/components/shared/icon";

const REFETCH_MS = 60_000;

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

export function NotificationBell() {
  const router = useRouter();
  const unread = api.notifications.unreadCount.useQuery(undefined, {
    refetchInterval: REFETCH_MS,
    refetchOnWindowFocus: true,
  });
  const list = api.notifications.list.useQuery(
    { limit: 12 },
    {
      refetchInterval: REFETCH_MS,
      refetchOnWindowFocus: true,
    },
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

  const count = unread.data ?? 0;
  const items = list.data ?? [];

  const handleSelect = (id: string, href: string | null) => {
    markRead.mutate({ id });
    if (href) router.push(href);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Notifications${count > 0 ? ` (${count} unread)` : ""}`}
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          border: "1px solid var(--v2-ink-200)",
          background: "white",
          color: "var(--v2-ink-700)",
          display: "grid",
          placeItems: "center",
          position: "relative",
          cursor: "pointer",
          padding: 0,
        }}
      >
        <Icon name="bell" size={18} />
        {count > 0 && (
          <span
            aria-hidden
            style={{
              position: "absolute",
              top: -2,
              right: -2,
              minWidth: 18,
              height: 18,
              padding: "0 5px",
              borderRadius: 999,
              background: "var(--v2-coral)",
              color: "white",
              fontSize: 10,
              fontWeight: 800,
              display: "grid",
              placeItems: "center",
              border: "2px solid white",
            }}
          >
            {count > 9 ? "9+" : count}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="min-w-80">
        <DropdownMenuLabel
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 14 }}>Notifications</span>
          {count > 0 && (
            <button
              type="button"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--v2-ink-500)",
                cursor: "pointer",
              }}
            >
              Mark all read
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <div
            style={{
              padding: "24px 16px",
              textAlign: "center",
              fontSize: 13,
              color: "var(--v2-ink-500)",
            }}
          >
            You&rsquo;re all caught up.
          </div>
        ) : (
          items.map((n) => (
            <DropdownMenuItem
              key={n.id}
              onSelect={() => handleSelect(n.id, n.href)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 2,
                padding: "10px 12px",
                background: n.readAt ? "transparent" : "var(--v2-accent-soft)",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--v2-ink-950)",
                  lineHeight: 1.3,
                }}
              >
                {n.title}
              </div>
              {n.body && (
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--v2-ink-600)",
                    lineHeight: 1.35,
                  }}
                >
                  {n.body}
                </div>
              )}
              <div
                style={{
                  fontSize: 11,
                  color: "var(--v2-ink-500)",
                  marginTop: 2,
                }}
              >
                {timeAgo(n.createdAt)}
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
