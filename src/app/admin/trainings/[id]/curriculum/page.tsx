import { notFound } from "next/navigation";
import { TRPCError } from "@trpc/server";
import { api } from "@/lib/trpc/server";
import { CurriculumClient } from "./curriculum-client";

export const metadata = { title: "Curriculum · Admin · Energized" };

type Params = { params: Promise<{ id: string }> };

export default async function AdminTrainingCurriculumPage({ params }: Params) {
  const { id } = await params;

  try {
    const training = await api.admin.trainings.getById({ id });
    return (
      <CurriculumClient
        trainingId={training.id}
        trainingTitle={training.title}
        trainingSlug={training.slug}
      />
    );
  } catch (err) {
    if (err instanceof TRPCError && err.code === "NOT_FOUND") {
      notFound();
    }
    throw err;
  }
}
