"use client";
import { useState } from "react";
import { AlertCircle, ArrowRight, Check, RefreshCw } from "lucide-react";
import { api } from "@/lib/trpc/client";

type Question = {
  id: string;
  prompt: string;
  options: [string, string, string, string];
};

type Lesson = {
  id: string;
  title: string;
  quizQuestionsJson: Question[] | null;
};

export function LessonQuiz({
  lesson,
  enrollmentId,
  isComplete,
  priorScore,
  onComplete,
  onNext,
  hasNext,
}: {
  lesson: Lesson;
  enrollmentId: string;
  isComplete: boolean;
  priorScore?: number;
  onComplete: (score: number) => void;
  onNext: () => void;
  hasNext: boolean;
}) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<{
    score: number;
    passed: boolean;
    correct: number;
    total: number;
  } | null>(null);

  const mut = api.trainings.submitQuiz.useMutation({
    onSuccess: (data) => {
      setResult(data);
      if (data.passed) onComplete(data.score);
    },
  });

  const questions = lesson.quizQuestionsJson ?? [];
  const allAnswered = questions.length > 0 && questions.every((q) => answers[q.id] !== undefined);

  if (isComplete && !result) {
    return (
      <div>
        <div
          className="rounded-2xl p-8 text-center"
          style={{
            background: "rgba(28,170,226,0.08)",
            border: "1px solid rgba(28,170,226,0.3)",
          }}
        >
          <Check
            className="mx-auto h-12 w-12"
            style={{ color: "var(--brand-blue, #1CAAE2)" }}
          />
          <h2
            className="mt-4 text-2xl font-bold tracking-tight"
            style={{ color: "#fff" }}
          >
            {lesson.title}
          </h2>
          <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
            Quiz already passed
            {priorScore !== undefined ? ` · ${priorScore}/100` : ""}
          </p>
        </div>
        {hasNext && (
          <div className="mt-6">
            <button
              onClick={onNext}
              className="inline-flex items-center gap-2 rounded-full text-sm font-bold"
              style={{
                padding: "12px 22px",
                background: "var(--brand-blue, #1CAAE2)",
                color: "var(--brand-black, #101820)",
              }}
            >
              Next lesson <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div
        className="rounded-2xl p-8"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <h1
          className="text-2xl font-bold tracking-tight md:text-3xl"
          style={{ color: "#fff" }}
        >
          {lesson.title}
        </h1>
        <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
          {questions.length} question{questions.length === 1 ? "" : "s"} · 70% to pass
        </p>
        <div className="mt-7 grid gap-7">
          {questions.map((q, idx) => (
            <div key={q.id}>
              <div
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                Question {idx + 1} of {questions.length}
              </div>
              <div className="mt-2 text-lg" style={{ color: "#fff" }}>
                {q.prompt}
              </div>
              <div className="mt-4 grid gap-2">
                {q.options.map((opt, i) => {
                  const isSelected = answers[q.id] === i;
                  return (
                    <button
                      key={i}
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: i }))}
                      className="flex items-start gap-3 rounded-xl text-left text-sm transition"
                      style={{
                        padding: "14px 16px",
                        background: isSelected
                          ? "var(--brand-blue, #1CAAE2)"
                          : "rgba(255,255,255,0.04)",
                        color: isSelected
                          ? "var(--brand-black, #101820)"
                          : "rgba(255,255,255,0.85)",
                        border:
                          "1px solid " +
                          (isSelected
                            ? "var(--brand-blue, #1CAAE2)"
                            : "rgba(255,255,255,0.1)"),
                      }}
                    >
                      <span
                        className="grid h-6 w-6 flex-shrink-0 place-items-center rounded text-xs font-bold"
                        style={{
                          background: isSelected
                            ? "var(--brand-black, #101820)"
                            : "rgba(255,255,255,0.08)",
                          color: isSelected
                            ? "var(--brand-blue, #1CAAE2)"
                            : "rgba(255,255,255,0.7)",
                        }}
                      >
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {result && !result.passed && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div>
            Scored {result.correct}/{result.total} ({result.score}%). Need 70% to pass — review
            the material and retry.
          </div>
        </div>
      )}

      {result && result.passed && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 p-5 text-sm text-emerald-900">
          <Check className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div>
            Passed — scored {result.correct}/{result.total} ({result.score}%).
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        {!result?.passed && !isComplete && (
          <button
            disabled={!allAnswered || mut.isPending}
            onClick={() =>
              mut.mutate({
                enrollmentId,
                lessonId: lesson.id,
                answers,
              })
            }
            className="inline-flex items-center gap-2 rounded-full text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              padding: "12px 22px",
              background: "var(--brand-blue, #1CAAE2)",
              color: "var(--brand-black, #101820)",
            }}
          >
            {result ? (
              <RefreshCw className="h-4 w-4" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {mut.isPending ? "Grading…" : result ? "Retry" : "Submit quiz"}
          </button>
        )}
        {(result?.passed ?? isComplete) && hasNext && (
          <button
            onClick={onNext}
            className="inline-flex items-center gap-2 rounded-full text-sm font-bold"
            style={{
              padding: "12px 22px",
              background: "var(--brand-blue, #1CAAE2)",
              color: "var(--brand-black, #101820)",
            }}
          >
            Next lesson <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
