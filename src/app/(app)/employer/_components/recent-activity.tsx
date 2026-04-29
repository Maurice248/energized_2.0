import { api } from "@/lib/trpc/server";
import { timeAgo } from "@/lib/time";
import { STAGE_FROM_DB, STAGE_LABEL } from "@/lib/application-stages";

export async function RecentActivity() {
  const events = await api.employer.getRecentActivity({ limit: 8 });

  if (events.length === 0) {
    return (
      <div className="rounded-xl border p-4">
        <div className="text-sm font-bold">Recent activity</div>
        <p className="mt-2 text-sm text-muted-foreground">
          Nothing yet — your team&rsquo;s activity will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border p-4">
      <div className="text-sm font-bold">Recent activity</div>
      <ul className="mt-3 divide-y">
        {events.map((e, i) => (
          <li key={i} className="flex items-baseline justify-between gap-3 py-2 text-sm">
            <span className="truncate">{renderEvent(e)}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {timeAgo(e.at)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function renderEvent(
  e: Awaited<ReturnType<typeof api.employer.getRecentActivity>>[number],
): string {
  switch (e.kind) {
    case "application_status_changed": {
      const stage = STAGE_FROM_DB[e.toStatus];
      return `${e.candidateName} → ${STAGE_LABEL[stage]} · ${e.jobTitle ?? "(untitled)"}`;
    }
    case "job_published":
      return `${e.jobTitle ?? "(untitled)"} published`;
    case "member_joined":
      return `${e.memberName} joined as ${e.role.replace("_", " ")}`;
  }
}
