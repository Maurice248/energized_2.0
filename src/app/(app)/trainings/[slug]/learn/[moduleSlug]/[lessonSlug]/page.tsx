import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { api } from "@/lib/trpc/server";
import { getSession } from "@/server/auth";
import { db } from "@/server/db";
import { trainingEnrollments } from "@/server/db/schema";
import { PlayerClient } from "./player-client";

export default async function LearnPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; moduleSlug: string; lessonSlug: string }>;
  searchParams: Promise<{ enrollment?: string }>;
}) {
  const { slug, moduleSlug, lessonSlug } = await params;
  const sp = await searchParams;

  const session = await getSession();
  if (!session) {
    redirect(`/sign-in?redirect=/trainings/${slug}`);
  }

  const data = await api.trainings.getBySlug({ slug }).catch(() => null);
  if (!data) notFound();

  const module_ = data.modules.find((m) => m.slug === moduleSlug);
  const lesson = module_?.lessons.find((l) => l.slug === lessonSlug);
  if (!module_ || !lesson) notFound();

  let enrollmentId = sp.enrollment ?? null;
  if (!enrollmentId) {
    const [enr] = await db
      .select({ id: trainingEnrollments.id })
      .from(trainingEnrollments)
      .where(
        and(
          eq(trainingEnrollments.candidateId, session.user.id),
          eq(trainingEnrollments.trainingId, data.training.id),
        ),
      )
      .limit(1);
    enrollmentId = enr?.id ?? null;
  }
  if (!enrollmentId) {
    redirect(`/trainings/${slug}`);
  }

  const progress = await api.trainings.getEnrollmentProgress({
    enrollmentId,
  });

  return (
    <PlayerClient
      training={{
        slug: data.training.slug,
        title: data.training.title,
        instructorName: data.training.instructorName,
        monogram: data.training.monogram,
        tileColor: data.training.tileColor,
      }}
      modules={data.modules}
      currentModuleSlug={moduleSlug}
      currentLessonSlug={lessonSlug}
      enrollmentId={enrollmentId}
      progressJson={progress.progressJson}
    />
  );
}
