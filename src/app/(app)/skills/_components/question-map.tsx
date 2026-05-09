"use client";

type Q = { id: string };

export function QuestionMap({
  questions,
  currentIdx,
  answers,
  flagged,
  onJump,
  allAnswered,
  onSubmit,
}: {
  questions: Q[];
  currentIdx: number;
  answers: Record<string, number>;
  flagged: Record<string, boolean>;
  onJump: (idx: number) => void;
  allAnswered: boolean;
  onSubmit: () => void;
}) {
  const answeredCount = Object.keys(answers).length;
  return (
    <aside className="sticky top-24 rounded-3xl border border-slate-200 bg-white p-6">
      <h4
        className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500"
        style={{ marginBottom: 18 }}
      >
        Question map
      </h4>
      <div className="grid grid-cols-5 gap-1.5">
        {questions.map((q, i) => {
          const cls: string[] = [];
          if (answers[q.id] !== undefined) cls.push("bg-[var(--brand-black)] text-white");
          else cls.push("bg-slate-100 text-slate-600");
          if (flagged[q.id]) cls.push("!bg-amber-500 !text-white");
          if (currentIdx === i) cls.push("ring-2 ring-[var(--brand-blue)] ring-offset-1");
          return (
            <button
              key={q.id}
              onClick={() => onJump(i)}
              className={`grid aspect-square place-items-center rounded-md border border-transparent text-[11px] font-bold transition hover:border-slate-700 ${cls.join(" ")}`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      <div className="mt-4 grid gap-2 text-xs text-slate-600">
        <Legend swColor="bg-[var(--brand-black)]" label="Answered" />
        <Legend swColor="bg-amber-500" label="Flagged" />
        <Legend swColor="bg-slate-100" label="Not answered" />
      </div>
      <div className="mt-4 border-t border-slate-200 pt-4">
        <button
          disabled={!allAnswered}
          onClick={onSubmit}
          className="w-full rounded-full bg-[var(--brand-black)] px-4 py-3 text-sm font-bold text-white transition hover:bg-[var(--brand-dark-blue)] disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {allAnswered ? "Submit test" : `${questions.length - answeredCount} unanswered`}
        </button>
      </div>
    </aside>
  );
}

function Legend({ swColor, label }: { swColor: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-3 w-3 rounded-sm ${swColor}`} /> {label}
    </div>
  );
}
