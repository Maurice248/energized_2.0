import { notFound } from "next/navigation";
import { TRPCError } from "@trpc/server";
import { api } from "@/lib/trpc/server";
import { LessonForm } from "@/app/admin/trainings/_components/lesson-form";

export const metadata = { title: "Edit lesson · Admin · Energized" };

type Params = { params: Promise<{ id: string; mid: string; lid: string }> };

export default async function AdminEditLessonPage({ params }: Params) {
  const { id, mid, lid } = await params;

  try {
    const lesson = await api.admin.trainings.lessonGetById({ id: lid });
    if (lesson.moduleId !== mid) {
      notFound();
    }
    return (
      <LessonForm
        mode="edit"
        trainingId={id}
        moduleId={mid}
        initial={lesson}
      />
    );
  } catch (err) {
    if (err instanceof TRPCError && err.code === "NOT_FOUND") {
      notFound();
    }
    throw err;
  }
}
