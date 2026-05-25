"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Icon } from "@/components/shared/icon";
import {
  filterAdminNavLinks,
  getAdminNavLinks,
  groupAdminNavLinks,
  type AdminNavLink,
  type AdminSidebarCounts,
} from "./admin-nav-items";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  counts: AdminSidebarCounts;
};

function useModKeyLabel() {
  const [label, setLabel] = useState("Ctrl");

  useEffect(() => {
    setLabel(/Mac|iPhone|iPod|iPad/i.test(navigator.platform) ? "⌘" : "Ctrl");
  }, []);

  return label;
}

export function AdminCommandPalette({ open, onOpenChange, counts }: Props) {
  const router = useRouter();
  const modKey = useModKeyLabel();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const navLinks = useMemo(() => getAdminNavLinks(counts), [counts]);
  const filteredLinks = useMemo(
    () => filterAdminNavLinks(navLinks, query),
    [navLinks, query],
  );
  const groupedLinks = useMemo(() => groupAdminNavLinks(filteredLinks), [filteredLinks]);

  const flatLinks = filteredLinks;

  const reset = useCallback(() => {
    setQuery("");
    setActiveIndex(0);
  }, []);

  const close = useCallback(() => {
    onOpenChange(false);
    reset();
  }, [onOpenChange, reset]);

  const navigateTo = useCallback(
    (link: AdminNavLink) => {
      close();
      router.push(link.href);
    },
    [close, router],
  );

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (activeIndex >= flatLinks.length) {
      setActiveIndex(Math.max(0, flatLinks.length - 1));
    }
  }, [activeIndex, flatLinks.length]);

  useEffect(() => {
    if (!open || flatLinks.length === 0) return;

    const activeEl = listRef.current?.querySelector<HTMLElement>(
      `[data-command-index="${activeIndex}"]`,
    );
    activeEl?.scrollIntoView({ block: "nearest", behavior: "auto" });
  }, [activeIndex, flatLinks.length, open]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(!open);
        if (open) reset();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onOpenChange, open, reset]);

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (flatLinks.length === 0) return;
      setActiveIndex((i) => (i + 1) % flatLinks.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (flatLinks.length === 0) return;
      setActiveIndex((i) => (i - 1 + flatLinks.length) % flatLinks.length);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const link = flatLinks[activeIndex];
      if (link) navigateTo(link);
    }
  };

  let runningIndex = -1;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="v2-admin-command-palette"
        aria-describedby={undefined}
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogTitle className="sr-only">Jump to admin page</DialogTitle>

        <div className="v2-admin-command-shell">
          <div className="v2-admin-command-search">
            <Icon name="search" size={16} aria-hidden />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Jump to page…"
              aria-label="Jump to admin page"
              autoComplete="off"
              spellCheck={false}
            />
            <kbd>{modKey}K</kbd>
          </div>

          <div
            ref={listRef}
            className="v2-admin-command-list"
            role="listbox"
            aria-label="Admin pages"
            aria-activedescendant={
              flatLinks.length > 0 ? `admin-command-option-${activeIndex}` : undefined
            }
          >
            {flatLinks.length === 0 ? (
              <div className="v2-admin-command-empty">No pages match your search.</div>
            ) : (
              groupedLinks.map((group) => (
                <div key={group.section} className="v2-admin-command-group">
                  <div className="v2-admin-command-group-label">{group.section}</div>
                  {group.links.map((link) => {
                    runningIndex += 1;
                    const index = runningIndex;
                    const active = index === activeIndex;

                    return (
                      <button
                        key={link.id}
                        id={`admin-command-option-${index}`}
                        type="button"
                        role="option"
                        aria-selected={active}
                        data-command-index={index}
                        className={`v2-admin-command-item${active ? " is-active" : ""}`}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => navigateTo(link)}
                      >
                        <span className="v2-admin-command-item-icon" aria-hidden>
                          <Icon name={link.icon} size={16} />
                        </span>
                        <span className="v2-admin-command-item-label">{link.label}</span>
                        {link.count !== undefined && link.count !== null && link.count > 0 ? (
                          <span
                            className={`v2-admin-command-item-count${link.accent ? " is-accent" : ""}`}
                          >
                            {link.count}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          <div className="v2-admin-command-foot">
            <span>
              <kbd>↑</kbd>
              <kbd>↓</kbd> navigate
            </span>
            <span>
              <kbd>Enter</kbd> open
            </span>
            <span>
              <kbd>Esc</kbd> close
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AdminSearchTrigger({
  onClick,
  modKey,
}: {
  onClick: () => void;
  modKey: string;
}) {
  return (
    <button type="button" className="v2-asb-search" onClick={onClick} aria-label="Jump to page">
      <Icon name="search" size={14} aria-hidden />
      <span>Jump to page…</span>
      <kbd suppressHydrationWarning>{modKey}K</kbd>
    </button>
  );
}

export function useAdminCommandModKey() {
  return useModKeyLabel();
}
