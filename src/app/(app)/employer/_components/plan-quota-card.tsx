import Link from "next/link";
import { TRPCError } from "@trpc/server";
import { api } from "@/lib/trpc/server";
import { TIERS } from "@/lib/billing-tiers";

export async function PlanQuotaCard() {
  let data;
  try {
    data = await api.billing.getCurrent();
  } catch (err) {
    if (err instanceof TRPCError && err.code === "NOT_FOUND") {
      return (
        <div className="rounded-xl border p-4">
          <div className="text-sm font-bold">Plan &amp; quota</div>
          <p className="mt-2 text-sm text-muted-foreground">
            No org found.
          </p>
        </div>
      );
    }
    throw err;
  }

  const planLabel = data.tier ? TIERS[data.tier].label : "No active plan";
  const quota = data.quota || 0;
  const used = data.publishedThisCycle || 0;
  const pct = quota > 0 ? Math.min(100, Math.round((used / quota) * 100)) : 0;

  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-baseline justify-between">
        <div className="text-sm font-bold">Plan &amp; quota</div>
        <Link
          href="/employer/profile#billing"
          className="text-xs font-bold text-[var(--v2-accent)] hover:underline"
        >
          Manage billing →
        </Link>
      </div>

      {data.tier ? (
        <>
          <div className="mt-2 text-base font-bold">{planLabel}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {used} of {quota} job posts used this cycle
          </div>
          <div
            className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted"
            aria-label={`${pct}% of quota used`}
          >
            <div
              className="h-full bg-[var(--v2-accent)]"
              style={{ width: `${pct}%` }}
            />
          </div>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted-foreground">
            You don&rsquo;t have an active subscription yet.
          </p>
          <Link
            href="/employer/profile#billing"
            className="v2-btn v2-btn-accent mt-3"
          >
            Choose a plan
          </Link>
        </>
      )}
    </div>
  );
}
