"use client";

import {
  useEffect,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";

/** Last resort when identity card is unavailable or off-screen. */
const ACTIVATION_LINE_FALLBACK_PX = 120;

/** While nav triggers smooth scrolling, suppress geometry updates to avoid flicker. */
export const PROFILE_SIDEBAR_SCROLL_SPY_HOLD_MS = 950;

function isAlignTargetLikelyVisible(rect: DOMRect): boolean {
  return rect.bottom >= 48 && rect.top <= window.innerHeight - 48;
}

/**
 * Prefer the sidebar location pill (`pp-location` upper edge).
 * Otherwise the grey rule atop “Profile strength” (`pp-completeness` border / block top edge).
 */
function activationViewportY(
  sidebarLocationAlignRef?: RefObject<Element | null>,
  sidebarDividerFallbackAlignRef?: RefObject<Element | null>,
): number {
  const locationEl = sidebarLocationAlignRef?.current;
  if (locationEl) {
    const r = locationEl.getBoundingClientRect();
    if (isAlignTargetLikelyVisible(r)) return r.top + 6;
  }

  const dividerEl = sidebarDividerFallbackAlignRef?.current;
  if (dividerEl) {
    const r = dividerEl.getBoundingClientRect();
    if (!isAlignTargetLikelyVisible(r)) return ACTIVATION_LINE_FALLBACK_PX;
    // Divider is `border-top` on `.pp-completeness`; use the block top edge.
    return r.top + 1;
  }

  return ACTIVATION_LINE_FALLBACK_PX;
}

export function useProfileSidebarScrollSpy(params: {
  /** Ordered top-to-bottom, matching anchors `${prefix}-${id}`. */
  navIdsOrdered: readonly string[];
  sectionIdPrefix: string;
  setActive: Dispatch<SetStateAction<string>>;
  enabled: boolean;
  /** When this changes after async content mounts, listeners re-bind (e.g. org id). */
  layoutKey?: string;
  /** Sidebar `.pp-location` — section anchors align to its upper edge when present. */
  sidebarLocationAlignRef?: RefObject<Element | null>;
  /** Grey rule above “Profile strength”; used when `.pp-location` is absent or not visible. */
  sidebarDividerFallbackAlignRef?: RefObject<Element | null>;
  /** Caller sets `.current = Date.now() + PROFILE_SIDEBAR_SCROLL_SPY_HOLD_MS` during smooth scroll. */
  programmaticScrollHoldUntilRef: RefObject<number>;
}): void {
  const {
    navIdsOrdered,
    sectionIdPrefix,
    setActive,
    enabled,
    layoutKey = "",
    sidebarLocationAlignRef,
    sidebarDividerFallbackAlignRef,
    programmaticScrollHoldUntilRef,
  } = params;

  useEffect(() => {
    if (!enabled || navIdsOrdered.length === 0) return;

    const measure = (): void => {
      if (Date.now() < programmaticScrollHoldUntilRef.current) return;

      let currentId = navIdsOrdered[0] ?? "";

      const scrollBottom = window.scrollY + window.innerHeight;
      const docBottom = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight,
      );
      if (scrollBottom >= docBottom - 6) {
        const lastId = navIdsOrdered[navIdsOrdered.length - 1];
        if (lastId) currentId = lastId;
        setActive((prev) => (prev === currentId ? prev : currentId));
        return;
      }

      const offset = activationViewportY(
        sidebarLocationAlignRef,
        sidebarDividerFallbackAlignRef,
      );

      for (const id of navIdsOrdered) {
        const el = document.getElementById(`${sectionIdPrefix}-${id}`);
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top <= offset) currentId = id;
      }

      setActive((prev) => (prev === currentId ? prev : currentId));
    };

    let raf = 0;
    const queue = (): void => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };

    queue();
    requestAnimationFrame(queue);

    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue, { passive: true });

    return () => {
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
      cancelAnimationFrame(raf);
    };
  }, [
    enabled,
    layoutKey,
    navIdsOrdered,
    sectionIdPrefix,
    programmaticScrollHoldUntilRef,
    sidebarDividerFallbackAlignRef,
    sidebarLocationAlignRef,
    setActive,
  ]);
}
