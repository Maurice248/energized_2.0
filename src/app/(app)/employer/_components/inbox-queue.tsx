import Link from "next/link";
import { api } from "@/lib/trpc/server";
import { timeAgo } from "@/lib/time";

export async function InboxQueue() {
  const { items, totalCount } = await api.employer.getInboxQueue({
    limit: 5,
  });

  if (items.length === 0) {
    return (
      <div className="rounded-xl border p-4">
        <div className="text-sm font-bold">Needs review</div>
        <p className="mt-2 text-sm text-muted-foreground">
          No new applicants right now.
        </p>
      </div>
    );
  }

  const moreCount = totalCount - items.length;

  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-baseline justify-between">
        <div className="text-sm font-bold">Needs review</div>
        <span className="text-xs text-muted-foreground">
          {totalCount} total
        </span>
      </div>

      <ul className="mt-3 divide-y">
        {items.map((row) => (
          <li key={row.applicationId} className="py-2">
            <Link
              href={`/employer/jobs/${row.jobId}/applicants`}
              className="flex items-baseline justify-between gap-3 hover:underline"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-bold">
                  {row.candidateName}
                </div>
                {row.candidateHeadline && (
                  <div className="truncate text-xs text-muted-foreground">
                    {row.candidateHeadline}
                  </div>
                )}
                <div className="truncate text-xs text-muted-foreground">
                  for {row.jobTitle}
                </div>
              </div>
              <div className="shrink-0 text-xs text-muted-foreground">
                {timeAgo(row.appliedAt)}
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {moreCount > 0 && (
        <Link
          href="/employer/jobs"
          className="mt-3 inline-block text-xs font-bold text-[var(--v2-accent)] hover:underline"
        >
          View {moreCount} more →
        </Link>
      )}
    </div>
  );
}
