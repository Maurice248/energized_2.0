"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/trpc/client";
import { RunnerBar } from "@/app/(app)/skills/_components/runner-bar";
import { QuestionCard } from "@/app/(app)/skills/_components/question-card";
import { QuestionMap } from "@/app/(app)/skills/_components/question-map";

type Q = {
  id: string;
  prompt: string;
  context: string | null;
  options: [string, string, string, string] | string[];
  tags: string[];
  tagKind: "scenario" | "calc" | null;
};

type Attempt = {
  id: string;
  questionsJson: Q[];
  questionCount: number;
  startedAt: Date | string;
  answersJson: Record<string, number> | null;
};

export function RunnerClient({
  attempt,
  topicSlug,
}: {
  attempt: Attempt;
  topicSlug: string;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>(attempt.answersJson ?? {});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});

  const totalSeconds = attempt.questionCount * 90;
  const startedAtMs = new Date(attempt.startedAt).getTime();
  const elapsedAtMount = Math.floor((Date.now() - startedAtMs) / 1000);
  const [secondsLeft, setSecondsLeft] = useState(Math.max(0, totalSeconds - elapsedAtMount));

  const saveMut = api.skillTests.saveAnswer.useMutation();
  const submitMut = api.skillTests.submitAttempt.useMutation({
    onSuccess: () => router.push(`/skills/${topicSlug}/attempt/${attempt.id}/result`),
  });
  const submitRef = useRef(submitMut);
  submitRef.current = submitMut;

  useEffect(() => {
    if (secondsLeft <= 0) {
      submitRef.current.mutate({ attemptId: attempt.id });
      return;
    }
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [secondsLeft, attempt.id]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  const setAnswer = (qid: string, idx: number) => {
    setAnswers((a) => ({ ...a, [qid]: idx }));
    saveMut.mutate({ attemptId: attempt.id, questionId: qid, selectedIdx: idx });
  };

  const q = attempt.questionsJson[current];
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === attempt.questionsJson.length;

  if (!q) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-50">
      <RunnerBar
        current={current + 1}
        total={attempt.questionsJson.length}
        answeredCount={answeredCount}
        secondsLeft={secondsLeft}
        onQuit={() => {
          if (window.confirm("Quit this test? It'll be marked forfeited.")) {
            router.push("/skills");
          }
        }}
      />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[1fr_280px]">
        <QuestionCard
          question={q}
          questionNumber={current + 1}
          selectedIdx={answers[q.id]}
          onSelect={(idx) => setAnswer(q.id, idx)}
          flagged={!!flagged[q.id]}
          onFlag={() => setFlagged((f) => ({ ...f, [q.id]: !f[q.id] }))}
          onPrev={() => setCurrent((c) => Math.max(0, c - 1))}
          onNext={() => setCurrent((c) => Math.min(attempt.questionsJson.length - 1, c + 1))}
          isFirst={current === 0}
          isLast={current === attempt.questionsJson.length - 1}
          onSubmit={() => submitMut.mutate({ attemptId: attempt.id })}
        />
        <QuestionMap
          questions={attempt.questionsJson}
          currentIdx={current}
          answers={answers}
          flagged={flagged}
          onJump={setCurrent}
          allAnswered={allAnswered}
          onSubmit={() => submitMut.mutate({ attemptId: attempt.id })}
        />
      </div>
    </div>
  );
}
