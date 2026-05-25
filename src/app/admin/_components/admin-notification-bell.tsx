"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
const READ_STORAGE_KEY = "energized.adminBellRead";
const NOTIFICATION_LIST_LIMITS = [8, 12, 50] as const;

const ATTENTION_IDS = [
  "attention:verifications",
  "attention:tickets",
  "attention:invoices",
  "attention:system",
] as const;

type AttentionItem = {
  id: (typeof ATTENTION_IDS)[number];
  title: string;
  body: string | null;
  href: string;
  urgent: boolean;
};

type AttentionCounts = {
  pendingOrgs: number;
  pendingCreds: number;
  openTickets: number;
  p1Tickets: number;
  invoiceAttention: number;
  degradedServices: number;
  outageServices: number;
};

type AttentionReadEntry = {
  readSignature: string | null;
  activeSignature: string;
  updatedAt: number;
};

type AttentionReadState = Record<string, AttentionReadEntry>;

type FeedItem =
  | {
      kind: "attention";
      id: string;
      title: string;
      body: string | null;
      href: string;
      urgent: boolean;
      isRead: boolean;
      sortAt: number;
    }
  | {
      kind: "personal";
      id: string;
      title: string;
      body: string | null;
      href: string | null;
      isRead: boolean;
      sortAt: number;
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

function loadAttentionReadState(): AttentionReadState {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(READ_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as AttentionReadState;
  } catch {
    return {};
  }
}

function saveAttentionReadState(state: AttentionReadState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(state));
}

function attentionSignature(id: string, counts: AttentionCounts): string {
  switch (id) {
    case "attention:verifications":
      return `v:${counts.pendingOrgs}:${counts.pendingCreds}`;
    case "attention:tickets":
      return `t:${counts.openTickets}:${counts.p1Tickets}`;
    case "attention:invoices":
      return `i:${counts.invoiceAttention}`;
    case "attention:system":
      return `s:${counts.degradedServices}:${counts.outageServices}`;
    default:
      return id;
  }
}

function attentionItemCount(id: string, counts: AttentionCounts): number {
  switch (id) {
    case "attention:verifications":
      return counts.pendingOrgs + counts.pendingCreds;
    case "attention:tickets":
      return counts.openTickets;
    case "attention:invoices":
      return counts.invoiceAttention;
    case "attention:system":
      return counts.degradedServices + counts.outageServices;
    default:
      return 1;
  }
}

function sidebarBadgeCount(id: string, counts: AttentionCounts): number {
  return attentionItemCount(id, counts);
}

function buildAttentionItems(counts: AttentionCounts): AttentionItem[] {
  const pendingVerifications = counts.pendingOrgs + counts.pendingCreds;
  const items: AttentionItem[] = [];

  if (pendingVerifications > 0) {
    items.push({
      id: "attention:verifications",
      title: `${pendingVerifications} pending verification${pendingVerifications === 1 ? "" : "s"}`,
      body: `${counts.pendingOrgs} employer org${counts.pendingOrgs === 1 ? "" : "s"} · ${counts.pendingCreds} credential scan${counts.pendingCreds === 1 ? "" : "s"}`,
      href: "/admin/verifications",
      urgent: pendingVerifications >= 5,
    });
  }

  if (counts.openTickets > 0) {
    items.push({
      id: "attention:tickets",
      title: `${counts.openTickets} open support ticket${counts.openTickets === 1 ? "" : "s"}`,
      body:
        counts.p1Tickets > 0
          ? `${counts.p1Tickets} P1 — respond in Customer support`
          : "Review the support inbox",
      href: "/admin/support",
      urgent: counts.p1Tickets > 0,
    });
  }

  if (counts.invoiceAttention > 0) {
    items.push({
      id: "attention:invoices",
      title: `${counts.invoiceAttention}${counts.invoiceAttention >= 99 ? "+" : ""} invoice${counts.invoiceAttention === 1 ? "" : "s"} need follow-up`,
      body: "Open or uncollectible Stripe invoices in the collections queue",
      href: "/admin/invoices",
      urgent: counts.invoiceAttention >= 3,
    });
  }

  const systemIssues = counts.degradedServices + counts.outageServices;
  if (systemIssues > 0) {
    items.push({
      id: "attention:system",
      title: `${systemIssues} integration${systemIssues === 1 ? "" : "s"} need attention`,
      body:
        counts.outageServices > 0
          ? `${counts.outageServices} outage${counts.outageServices === 1 ? "" : "s"} · ${counts.degradedServices} degraded`
          : `${counts.degradedServices} service${counts.degradedServices === 1 ? "" : "s"} running degraded`,
      href: "/admin/system",
      urgent: counts.outageServices > 0,
    });
  }

  return items;
}

function syncAttentionReadState(
  prev: AttentionReadState,
  counts: AttentionCounts,
): AttentionReadState {
  const next: AttentionReadState = { ...prev };

  for (const id of ATTENTION_IDS) {
    const badge = sidebarBadgeCount(id, counts);
    if (badge === 0) {
      delete next[id];
      continue;
    }

    const activeSignature = attentionSignature(id, counts);
    const existing = prev[id];

    if (!existing || existing.activeSignature !== activeSignature) {
      next[id] = {
        readSignature: existing?.readSignature ?? null,
        activeSignature,
        updatedAt: Date.now(),
      };
    } else {
      next[id] = existing;
    }
  }

  return next;
}

function isAttentionRead(
  id: string,
  counts: AttentionCounts,
  readState: AttentionReadState,
): boolean {
  const signature = attentionSignature(id, counts);
  const entry = readState[id];
  return entry?.readSignature === signature;
}

function sortFeedItems(items: FeedItem[]): FeedItem[] {
  return [...items].sort((a, b) => {
    if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
    return b.sortAt - a.sortAt;
  });
}

export function AdminNotificationBell() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [attentionReadState, setAttentionReadState] = useState<AttentionReadState>({});

  useEffect(() => {
    setAttentionReadState(loadAttentionReadState());
  }, []);

  const queryOpts = {
    refetchInterval: REFETCH_MS,
    refetchOnWindowFocus: true,
  } as const;

  const unread = api.notifications.unreadCount.useQuery(undefined, queryOpts);
  const notifications = api.notifications.list.useQuery({ limit: 8 }, queryOpts);
  const verifications = api.admin.verifications.counts.useQuery(undefined, queryOpts);
  const tickets = api.admin.tickets.list.useQuery({ status: "open", limit: 1 }, queryOpts);
  const invoices = api.admin.invoices.attentionCount.useQuery(undefined, queryOpts);
  const system = api.admin.system.list.useQuery(undefined, queryOpts);

  const utils = api.useUtils();

  const syncNotificationCaches = async () => {
    await Promise.all([
      utils.notifications.list.invalidate(),
      utils.notifications.unreadCount.invalidate(),
    ]);
  };

  const markReadInCaches = (id: string) => {
    const readAt = new Date();
    for (const limit of NOTIFICATION_LIST_LIMITS) {
      utils.notifications.list.setData({ limit }, (old) =>
        old?.map((n) => (n.id === id ? { ...n, readAt } : n)),
      );
    }
    utils.notifications.unreadCount.setData(undefined, (old) =>
      old !== undefined ? Math.max(0, old - 1) : old,
    );
  };

  const markAllReadInCaches = () => {
    const readAt = new Date();
    for (const limit of NOTIFICATION_LIST_LIMITS) {
      utils.notifications.list.setData({ limit }, (old) =>
        old?.map((n) => (n.readAt ? n : { ...n, readAt })),
      );
    }
    utils.notifications.unreadCount.setData(undefined, 0);
  };

  const markRead = api.notifications.markRead.useMutation({
    onMutate: ({ id }) => {
      markReadInCaches(id);
    },
    onSuccess: () => {
      void syncNotificationCaches();
    },
    onError: () => {
      void syncNotificationCaches();
    },
  });

  const markAllRead = api.notifications.markAllRead.useMutation({
    onMutate: () => {
      markAllReadInCaches();
    },
    onSuccess: () => {
      void syncNotificationCaches();
    },
    onError: () => {
      void syncNotificationCaches();
    },
  });

  const attentionCounts = useMemo<AttentionCounts>(
    () => ({
      pendingOrgs: verifications.data?.pendingOrgs ?? 0,
      pendingCreds: verifications.data?.pendingCreds ?? 0,
      openTickets: tickets.data?.openTotal ?? 0,
      p1Tickets: tickets.data?.p1Total ?? 0,
      invoiceAttention: invoices.data ?? 0,
      degradedServices: system.data?.degradedCount ?? 0,
      outageServices: system.data?.outageCount ?? 0,
    }),
    [verifications.data, tickets.data, invoices.data, system.data],
  );

  useEffect(() => {
    setAttentionReadState((prev) => {
      const next = syncAttentionReadState(prev, attentionCounts);
      saveAttentionReadState(next);
      return next;
    });
  }, [attentionCounts]);

  const attentionItems = useMemo(
    () => buildAttentionItems(attentionCounts),
    [attentionCounts],
  );

  const feedItems = useMemo(() => {
    const items: FeedItem[] = [];

    for (const item of attentionItems) {
      const isRead = isAttentionRead(item.id, attentionCounts, attentionReadState);
      items.push({
        kind: "attention",
        id: item.id,
        title: item.title,
        body: item.body,
        href: item.href,
        urgent: item.urgent,
        isRead,
        sortAt: attentionReadState[item.id]?.updatedAt ?? Date.now(),
      });
    }

    for (const n of notifications.data ?? []) {
      items.push({
        kind: "personal",
        id: n.id,
        title: n.title,
        body: n.body,
        href: n.href,
        isRead: Boolean(n.readAt),
        sortAt: new Date(n.createdAt).getTime(),
      });
    }

    return sortFeedItems(items);
  }, [attentionItems, attentionCounts, attentionReadState, notifications.data]);

  const unreadAttentionCount = attentionItems.reduce((sum, item) => {
    if (isAttentionRead(item.id, attentionCounts, attentionReadState)) return sum;
    return sum + attentionItemCount(item.id, attentionCounts);
  }, 0);

  const unreadPersonal = unread.data ?? 0;
  const badgeCount = unreadAttentionCount + unreadPersonal;
  const hasUnread = badgeCount > 0;
  const hasItems = feedItems.length > 0;

  const markAttentionRead = (id: string) => {
    const signature = attentionSignature(id, attentionCounts);
    setAttentionReadState((prev) => {
      const next: AttentionReadState = {
        ...prev,
        [id]: {
          readSignature: signature,
          activeSignature: signature,
          updatedAt: prev[id]?.updatedAt ?? Date.now(),
        },
      };
      saveAttentionReadState(next);
      return next;
    });
  };

  const markAllAttentionRead = () => {
    setAttentionReadState((prev) => {
      const next: AttentionReadState = { ...prev };
      for (const item of attentionItems) {
        const signature = attentionSignature(item.id, attentionCounts);
        next[item.id] = {
          readSignature: signature,
          activeSignature: signature,
          updatedAt: prev[item.id]?.updatedAt ?? Date.now(),
        };
      }
      saveAttentionReadState(next);
      return next;
    });
  };

  const handleAttentionSelect = (id: string, href: string, isRead: boolean) => {
    setMenuOpen(false);
    if (!isRead) markAttentionRead(id);
    router.push(href);
  };

  const handleNotificationSelect = async (
    id: string,
    href: string | null,
    alreadyRead: boolean,
  ) => {
    setMenuOpen(false);
    if (!alreadyRead) {
      await markRead.mutateAsync({ id });
    }
    if (href) router.push(href);
  };

  const handleMarkAllRead = () => {
    markAllAttentionRead();
    if (unreadPersonal > 0) markAllRead.mutate();
  };

  return (
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="v2-atop-icon-btn"
          aria-label={`Notifications${badgeCount > 0 ? ` (${badgeCount} unread)` : ""}`}
        >
          <Icon name="bell" size={16} />
          {badgeCount > 0 ? (
            <span
              aria-hidden
              style={{
                position: "absolute",
                top: -2,
                right: -2,
                minWidth: 16,
                height: 16,
                padding: "0 4px",
                borderRadius: 999,
                background: "var(--v2-coral)",
                color: "white",
                fontSize: 9,
                fontWeight: 800,
                display: "grid",
                placeItems: "center",
                border: "2px solid white",
                lineHeight: 1,
              }}
            >
              {badgeCount > 9 ? "9+" : badgeCount}
            </span>
          ) : null}
        </button>
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
          {hasUnread ? (
            <button
              type="button"
              onClick={handleMarkAllRead}
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
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {!hasItems ? (
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
          feedItems.map((item) => (
            <DropdownMenuItem
              key={item.id}
              onSelect={() => {
                if (item.kind === "attention") {
                  handleAttentionSelect(item.id, item.href, item.isRead);
                } else {
                  void handleNotificationSelect(item.id, item.href, item.isRead);
                }
              }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 2,
                padding: "10px 12px",
                background: item.isRead
                  ? "transparent"
                  : item.kind === "attention" && item.urgent
                    ? "var(--v2-coral-soft)"
                    : "var(--v2-accent-soft)",
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
                {item.title}
              </div>
              {item.body ? (
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--v2-ink-600)",
                    lineHeight: 1.35,
                  }}
                >
                  {item.body}
                </div>
              ) : null}
              {item.kind === "personal" ? (
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--v2-ink-500)",
                    marginTop: 2,
                  }}
                >
                  {timeAgo(new Date(item.sortAt))}
                </div>
              ) : null}
            </DropdownMenuItem>
          ))
        )}
        {(notifications.data?.length ?? 0) > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                href="/notifications"
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--v2-ink-700)",
                  textAlign: "center",
                  width: "100%",
                  justifyContent: "center",
                }}
              >
                View all personal notifications
              </Link>
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
