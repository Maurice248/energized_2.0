import Link from "next/link";
import { api } from "@/lib/trpc/server";

export async function StaleAlerts() {
  const { staleApplicants, coldJobs } = await api.employer.getStaleAlerts();

  if (staleApplicants.length === 0 && coldJobs.length === 0) {
    return (
      <div className="rounded-xl border p-4">
        <div className="text-sm font-bold">Alerts</div>
        <p className="mt-2 text-sm text-muted-foreground">
          All jobs healthy.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border p-4">
      <div className="text-sm font-bold">Alerts</div>

      {staleApplicants.length > 0 && (
        <div className="mt-3">
          <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Stuck applicants
          </div>
          <ul className="mt-1 divide-y">
            {staleApplicants.map((a) => (
              <li key={a.applicationId} className="py-2">
                <Link
                  href={`/employer/jobs/${a.jobId}/applicants`}
                  className="flex items-baseline justify-between gap-3 text-sm hover:underline"
                >
                  <span className="truncate">
                    {a.candidateName}{" "}
                    <span className="text-muted-foreground">
                      · {a.jobTitle}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {a.daysSinceUpdate}d
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {coldJobs.length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Cold jobs (no applicants yet)
          </div>
          <ul className="mt-1 divide-y">
            {coldJobs.map((j) => (
              <li key={j.jobId} className="py-2">
                <Link
                  href={`/employer/jobs/${j.jobId}/edit`}
                  className="flex items-baseline justify-between gap-3 text-sm hover:underline"
                >
                  <span className="truncate">{j.jobTitle}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {j.daysSincePosted}d live
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
