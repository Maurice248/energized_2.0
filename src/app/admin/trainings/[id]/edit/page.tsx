import { notFound } from "next/navigation";
import { TRPCError } from "@trpc/server";
import { api } from "@/lib/trpc/server";
import { TrainingForm } from "@/app/admin/trainings/_components/training-form";

export const metadata = { title: "Edit training · Admin · Energized" };

type Params = { params: Promise<{ id: string }> };

export default async function AdminEditTrainingPage({ params }: Params) {
  const { id } = await params;

  try {
    const training = await api.admin.trainings.getById({ id });
    return <TrainingForm mode="edit" initial={training} />;
  } catch (err) {
    if (err instanceof TRPCError && err.code === "NOT_FOUND") {
      notFound();
    }
    throw err;
  }
}
