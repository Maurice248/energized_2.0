import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/server/auth";
import { api } from "@/lib/trpc/server";
import { JobPreviewCard } from "@/components/jobs/job-preview-card";
import { Icon } from "@/components/shared/icon";

export const metadata = { title: "Preview role — Energized" };

export default async function JobPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const { id } = await params;
  let job;
  try {
    job = await api.jobs.getById({ id });
  } catch {
    notFound();
  }

  return (
    <div className="v2" style={{ minHeight: "100vh", background: "var(--v2-ink-50)" }}>
      <div
        className="v2-container"
        style={{
          paddingTop: 32,
          paddingBottom: 64,
          maxWidth: 820,
        }}
      >
        <Link
          href={`/employer/jobs/${id}/edit?step=1`}
          className="v2-btn v2-btn-ghost v2-btn-sm"
          style={{ marginBottom: 24, display: "inline-flex" }}
        >
          <Icon name="arrowUpRight" size={14} /> Back to editor
        </Link>
        <JobPreviewCard job={job} />
      </div>
    </div>
  );
}
