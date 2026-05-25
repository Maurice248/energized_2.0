"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/shared/icon";
import { signOut } from "@/lib/auth/client";
import { cn } from "@/lib/utils";
import {
  AdminCommandPalette,
  AdminSearchTrigger,
  useAdminCommandModKey,
} from "./admin-command-palette";
import { getAdminNavLinks, type AdminSidebarCounts } from "./admin-nav-items";

export type { AdminSidebarCounts };

type Props = {
  user: { name: string; initials: string; role: string };
  counts: AdminSidebarCounts;
};

export function AdminSidebar({ user, counts }: Props) {
  const pathname = usePathname() ?? "/admin";
  const router = useRouter();
  const modKey = useAdminCommandModKey();
  const [commandOpen, setCommandOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };

  const navLinks = getAdminNavLinks(counts);

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  let lastSection: string | null = null;

  return (
    <aside className="v2-asb">
      <div className="v2-asb-brand">
        <div className="v2-logomark">E</div>
        <div className="v2-wordmark">
          Energ<em>ized</em>
        </div>
        <div className="v2-asb-tag">Admin</div>
      </div>

      <AdminSearchTrigger onClick={() => setCommandOpen(true)} modKey={modKey} />
      <AdminCommandPalette open={commandOpen} onOpenChange={setCommandOpen} counts={counts} />

      {navLinks.map((link) => {
        const sectionHeader =
          link.section !== lastSection ? (
            <div key={`section-${link.section}`} className="v2-asb-section">
              {link.section}
            </div>
          ) : null;
        lastSection = link.section;

        const active = isActive(link.href);

        return (
          <span key={link.id} style={{ display: "contents" }}>
            {sectionHeader}
            <Link href={link.href} className={`v2-asb-link ${active ? "active" : ""}`}>
              <Icon name={link.icon} size={16} />
              {link.label}
              {link.count !== undefined && link.count !== null && link.count > 0 ? (
                <span
                  className={`count ${link.alert ? "alert" : link.accent ? "accent" : ""}`}
                >
                  {link.count}
                </span>
              ) : null}
            </Link>
          </span>
        );
      })}

      <div className="v2-asb-foot">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "v2-asb-user w-full border-0 bg-transparent text-left font-[inherit]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--v2-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--v2-ink-950)]",
              )}
              aria-label="Open account menu"
            >
              <div className="v2-asb-user-avatar">{user.initials}</div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="v2-asb-user-name">{user.name}</div>
                <div className="v2-asb-user-role">{user.role}</div>
              </div>
              <Icon name="chevronRight" size={14} aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="right"
            align="end"
            sideOffset={8}
            className="v2-asb-user-menu min-w-52 ring-0"
          >
            <div className="v2-asb-user-menu-head" role="presentation">
              <p className="v2-asb-user-menu-title">{user.name}</p>
              <p className="v2-asb-user-menu-eyebrow">{user.role}</p>
            </div>
            <DropdownMenuSeparator className="v2-asb-user-menu-sep" />
            <DropdownMenuItem asChild className="v2-asb-user-menu-item">
              <Link href="/">Switch to home page</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="v2-asb-user-menu-sep" />
            <DropdownMenuItem
              className="v2-asb-user-menu-item v2-asb-user-menu-item--danger"
              onSelect={() => void handleSignOut()}
            >
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
