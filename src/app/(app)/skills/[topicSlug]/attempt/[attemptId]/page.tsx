import { notFound, redirect } from "next/navigation";
import { api } from "@/lib/trpc/server";
import { getSession } from "@/server/auth";
import { RunnerClient } from "./runner-client";

export default async function RunnerPage({
  params,
}: {
  params: Promise<{ topicSlug: string; attemptId: string }>;
}) {
  const { topicSlug, attemptId } = await params;
  const session = await getSession();
  if (session?.user?.role === "employer") {
    redirect(`/candidates?badges=${encodeURIComponent(topicSlug)}`);
  }
  const attempt = await api.skillTests
    .getAttempt({ attemptId })
    .catch(() => null);
  if (!attempt) notFound();
  if (attempt.status !== "in_progress") {
    redirect(`/skills/${topicSlug}/attempt/${attemptId}/result`);
  }
  return <RunnerClient attempt={attempt} topicSlug={topicSlug} />;
}
