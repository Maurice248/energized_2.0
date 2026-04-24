import { redirect } from "next/navigation";
import { TRPCError } from "@trpc/server";
import { getSession } from "@/server/auth";
import { api } from "@/lib/trpc/server";

export const metadata = { title: "New role — Energized" };

export default async function NewJobPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  let draftId: string;
  try {
    const row = await api.jobs.createDraft();
    draftId = row.id;
  } catch (e) {
    if (e instanceof TRPCError && e.code === "NOT_FOUND") {
      redirect("/employer/onboarding");
    }
    throw e;
  }

  redirect(`/employer/jobs/${draftId}/edit?step=1`);
}
