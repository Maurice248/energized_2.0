"use client";

import { useEffect, useState } from "react";

export { CopyLinkButton } from "@/components/shared/copy-link-button";

function formatRelative(ms: number): string {
  if (ms < 45_000) return "just now";
  const m = Math.round(ms / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function LiveTime({ since }: { since: number }) {
  const [now, setNow] = useState<number>(since);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  return <>{formatRelative(now - since)}</>;
}
