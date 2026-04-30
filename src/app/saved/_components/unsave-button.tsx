"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/trpc/client";
import { Icon } from "@/components/shared/icon";

export function UnsaveButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const toggle = api.savedJobs.toggle.useMutation({
    onSuccess: () => {
      start(() => router.refresh());
    },
  });

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggle.mutate({ jobId });
  };

  const busy = toggle.isPending || isPending;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-label="Remove from saved"
      className="v2-btn v2-btn-ghost v2-btn-sm"
      style={{
        flexShrink: 0,
        padding: "6px 10px",
        gap: 6,
        opacity: busy ? 0.5 : 1,
      }}
    >
      <Icon name="x" size={14} />
      Remove
    </button>
  );
}
