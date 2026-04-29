import Link from "next/link";
import { api } from "@/lib/trpc/server";

const COLS: Array<{
  key: "applied" | "review" | "interview" | "offer";
  label: string;
}> = [
  { key: "applied", label: "Applied" },
  { key: "review", label: "Review" },
  { key: "interview", label: "Interview" },
  { key: "offer", label: "Offer" },
];

export async function PipelineByJob() {
  const rows = await api.employer.getPipelineByJob();

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border p-4">
        <div className="text-sm font-bold">Pipeline</div>
        <p className="mt-2 text-sm text-muted-foreground">
          No published jobs yet.
        </p>
        <Link
          href="/employer/jobs/new"
          className="v2-btn v2-btn-accent mt-3"
        >
          Post a job
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border p-4">
      <div className="text-sm font-bold">Pipeline</div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-4 font-normal">Job</th>
              {COLS.map((c) => (
                <th key={c.key} className="px-2 py-2 text-right font-normal">
                  {c.label}
                </th>
              ))}
              <th className="py-2 pl-4 text-right font-normal">View</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.jobId} className="border-b last:border-0">
                <td className="py-2 pr-4 font-bold">{r.jobTitle}</td>
                {COLS.map((c) => (
                  <td
                    key={c.key}
                    className="px-2 py-2 text-right tabular-nums"
                  >
                    {r.counts[c.key]}
                  </td>
                ))}
                <td className="py-2 pl-4 text-right">
                  <Link
                    href={`/employer/jobs/${r.jobId}/applicants`}
                    className="text-xs font-bold text-[var(--v2-accent)] hover:underline"
                  >
                    Open →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
