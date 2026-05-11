"use client";
import { Bookmark, Check, ChevronLeft, ChevronRight } from "lucide-react";

type Q = {
  id: string;
  prompt: string;
  context: string | null;
  options: [string, string, string, string] | string[];
  tags: string[];
  tagKind: "scenario" | "calc" | null;
};

export function QuestionCard({
  question,
  questionNumber,
  selectedIdx,
  onSelect,
  flagged,
  onFlag,
  onPrev,
  onNext,
  isFirst,
  isLast,
  onSubmit,
}: {
  question: Q;
  questionNumber: number;
  selectedIdx: number | undefined;
  onSelect: (idx: number) => void;
  flagged: boolean;
  onFlag: () => void;
  onPrev: () => void;
  onNext: () => void;
  isFirst: boolean;
  isLast: boolean;
  onSubmit: () => void;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-10">
      <div className="mb-5 flex flex-wrap gap-1.5">
        {question.tags.map((t, i) => (
          <span
            key={i}
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
              i === 0 && question.tagKind === "scenario"
                ? "bg-amber-50 text-amber-900"
                : i === 0 && question.tagKind === "calc"
                  ? "bg-blue-100 text-blue-900"
                  : "bg-slate-100 text-slate-700"
            }`}
          >
            {t}
          </span>
        ))}
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-700">
          Question {questionNumber}
        </span>
      </div>
      <div className="text-2xl font-bold leading-snug tracking-tight md:text-3xl">
        {question.prompt}
      </div>
      {question.context && (
        <div className="mt-4 rounded-md border-l-4 border-[var(--brand-dark-blue)] bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
          <strong className="font-semibold text-slate-900">Given:</strong>{" "}
          {question.context.replace(/^\s*given:\s*/i, "")}
        </div>
      )}
      <div className="mt-7 grid gap-2.5">
        {question.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => onSelect(i)}
            className={`flex items-start gap-4 rounded-xl border p-5 text-left transition ${
              selectedIdx === i
                ? "border-[var(--brand-black)] bg-[var(--brand-black)] text-white"
                : "border-slate-200 bg-white hover:border-slate-700 hover:bg-slate-50"
            }`}
          >
            <div
              className={`grid h-7 w-7 flex-shrink-0 place-items-center rounded-md border text-xs font-bold ${
                selectedIdx === i
                  ? "border-[var(--brand-blue)] bg-[var(--brand-blue)] text-[var(--brand-black)]"
                  : "border-slate-300 bg-white text-slate-700"
              }`}
            >
              {String.fromCharCode(65 + i)}
            </div>
            <span className="text-[15px] leading-relaxed">{opt}</span>
          </button>
        ))}
      </div>
      <div className="mt-8 flex items-center justify-between gap-4 border-t border-slate-200 pt-6">
        <button
          onClick={onFlag}
          className={`inline-flex items-center gap-2 text-sm font-medium transition ${
            flagged ? "text-amber-700" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <Bookmark className="h-3.5 w-3.5" />
          {flagged ? "Flagged for review" : "Flag for review"}
        </button>
        <div className="flex gap-2.5">
          <button
            disabled={isFirst}
            onClick={onPrev}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:border-slate-700 disabled:opacity-50"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Prev
          </button>
          {!isLast ? (
            <button
              onClick={onNext}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-black)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--brand-dark-blue)]"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              onClick={onSubmit}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-blue)] px-4 py-2 text-sm font-bold text-[var(--brand-black)] hover:bg-[var(--brand-dark-blue)] hover:text-white"
            >
              Submit <Check className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
