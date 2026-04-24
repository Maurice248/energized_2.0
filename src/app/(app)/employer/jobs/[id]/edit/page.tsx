import { redirect, notFound } from "next/navigation";
import { getSession } from "@/server/auth";
import { api } from "@/lib/trpc/server";
import { JobWizardClient } from "./job-wizard-client";

export const metadata = { title: "Edit role — Energized" };

export default async function EditJobPage({
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

  return <JobWizardClient initial={job} />;
}
