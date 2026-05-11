"use client";
import { ArrowRight, Check } from "lucide-react";
import type { ReactNode } from "react";
import { api } from "@/lib/trpc/client";

type Lesson = {
  id: string;
  title: string;
  practiceMarkdown: string | null;
};

function renderMarkdown(md: string): ReactNode[] {
  const blocks = md.split(/\n\s*\n/);
  return blocks.map((block, i) => {
    const trimmed = block.trim();
    if (trimmed.startsWith("# ")) {
      return (
        <h2
          key={i}
          className="mt-6 text-2xl font-bold tracking-tight"
          style={{ color: "#fff" }}
        >
          {trimmed.slice(2)}
        </h2>
      );
    }
    if (trimmed.startsWith("## ")) {
      return (
        <h3
          key={i}
          className="mt-5 text-xl font-bold tracking-tight"
          style={{ color: "#fff" }}
        >
          {trimmed.slice(3)}
        </h3>
      );
    }
    if (trimmed.split("\n").every((l) => l.trim().startsWith("- "))) {
      return (
        <ul key={i} className="mt-3 grid gap-2">
          {trimmed.split("\n").map((line, j) => (
            <li
              key={j}
              className="flex items-start gap-2.5 text-sm"
              style={{ color: "rgba(255,255,255,0.85)" }}
            >
              <span
                className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full"
                style={{ background: "var(--brand-blue, #1CAAE2)" }}
              />
              {line.replace(/^-\s*/, "")}
            </li>
          ))}
        </ul>
      );
    }
    return (
      <p
        key={i}
        className="mt-3 text-sm leading-relaxed"
        style={{ color: "rgba(255,255,255,0.85)" }}
      >
        {trimmed}
      </p>
    );
  });
}

export function LessonPractice({
  lesson,
  enrollmentId,
  isComplete,
  onComplete,
  onNext,
  hasNext,
}: {
  lesson: Lesson;
  enrollmentId: string;
  isComplete: boolean;
  onComplete: () => void;
  onNext: () => void;
  hasNext: boolean;
}) {
  const mut = api.trainings.markLessonComplete.useMutation({
    onSuccess: () => onComplete(),
  });

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
        <div className="mt-4">{renderMarkdown(lesson.practiceMarkdown ?? "")}</div>
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        {!isComplete ? (
          <button
            disabled={mut.isPending}
            onClick={() => mut.mutate({ enrollmentId, lessonId: lesson.id })}
            className="inline-flex items-center gap-2 rounded-full text-sm font-bold transition disabled:opacity-50"
            style={{
              padding: "12px 22px",
              background: "var(--brand-blue, #1CAAE2)",
              color: "var(--brand-black, #101820)",
            }}
          >
            <Check className="h-4 w-4" />
            {mut.isPending ? "Saving…" : "Mark complete"}
          </button>
        ) : (
          <div
            className="inline-flex items-center gap-2 rounded-full text-sm font-bold"
            style={{
              padding: "12px 22px",
              background: "rgba(28,170,226,0.18)",
              color: "var(--brand-blue, #1CAAE2)",
              border: "1px solid rgba(28,170,226,0.4)",
            }}
          >
            <Check className="h-4 w-4" /> Completed
          </div>
        )}
        {hasNext && (
          <button
            onClick={onNext}
            className="inline-flex items-center gap-2 rounded-full text-sm font-medium"
            style={{
              padding: "12px 22px",
              background: "transparent",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            Next lesson <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
