import { TrainingCard, type CardTraining } from "./training-card";

export function FeaturedStrip({
  trainings,
  isEmployer,
}: {
  trainings: CardTraining[];
  isEmployer: boolean;
}) {
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
          Featured{" "}
          <em
            className="not-italic italic"
            style={{ color: "var(--brand-dark-blue, #004984)" }}
          >
            trainings
          </em>
          .
        </h2>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {trainings.map((t) => (
          <TrainingCard key={t.slug} training={t} isEmployer={isEmployer} />
        ))}
      </div>
    </div>
  );
}
