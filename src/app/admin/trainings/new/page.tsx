import { TrainingForm } from "@/app/admin/trainings/_components/training-form";

export const metadata = { title: "New training · Admin · Energized" };

export default function AdminNewTrainingPage() {
  return <TrainingForm mode="create" />;
}
