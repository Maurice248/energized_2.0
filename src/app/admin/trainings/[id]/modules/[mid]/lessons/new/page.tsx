import { LessonForm } from "@/app/admin/trainings/_components/lesson-form";

export const metadata = { title: "New lesson · Admin · Energized" };

type Params = { params: Promise<{ id: string; mid: string }> };

export default async function AdminNewLessonPage({ params }: Params) {
  const { id, mid } = await params;
  return <LessonForm mode="create" trainingId={id} moduleId={mid} />;
}
