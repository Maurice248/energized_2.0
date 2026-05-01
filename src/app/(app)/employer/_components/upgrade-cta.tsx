"use client";

import { api } from "@/lib/trpc/client";
import type { PlanTier } from "@/lib/billing-tiers";

const TIER_LABELS: Record<PlanTier, string> = {
  package_a: "Package A",
  package_b: "Package B",
  package_c: "Package C",
};

export function UpgradeCta({
  currentTier,
  nextTier,
}: {
  currentTier: PlanTier;
  nextTier: PlanTier;
}) {
  const utils = api.useUtils();
  const switchTier = api.billing.switchTier.useMutation({
    onSuccess: () => {
      void utils.billing.getCurrent.invalidate();
    },
  });

  return (
    <div className="mt-3 flex items-center gap-2">
      <button
        type="button"
        onClick={() => {
          if (
            !window.confirm(
              `Upgrade from ${TIER_LABELS[currentTier]} to ${TIER_LABELS[nextTier]}? You'll be charged the prorated difference for the rest of this cycle.`,
            )
          )
            return;
          switchTier.mutate({ tier: nextTier });
        }}
        disabled={switchTier.isPending}
        className="v2-btn v2-btn-accent"
        style={{ fontSize: 12, padding: "6px 12px" }}
      >
        {switchTier.isPending
          ? "Upgrading…"
          : `Upgrade to ${TIER_LABELS[nextTier]}`}
      </button>
      {switchTier.error && (
        <span style={{ fontSize: 12, color: "#A63A20" }}>
          {switchTier.error.message}
        </span>
      )}
    </div>
  );
}
