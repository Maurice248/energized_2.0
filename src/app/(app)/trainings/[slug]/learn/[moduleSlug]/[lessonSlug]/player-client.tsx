"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { PlayerBar } from "@/app/(app)/trainings/_components/player-bar";
import { PlayerSidebar } from "@/app/(app)/trainings/_components/player-sidebar";
import { LessonVideo } from "@/app/(app)/trainings/_components/lesson-video";
import { LessonPractice } from "@/app/(app)/trainings/_components/lesson-practice";
import { LessonQuiz } from "@/app/(app)/trainings/_components/lesson-quiz";

type Lesson = {
  id: string;
  slug: string;
  title: string;
  kind: "video" | "practice" | "quiz";
  durationLabel: string;
  videoUrl: string | null;
  videoProvider: string | null;
  practiceMarkdown: string | null;
  quizQuestionsJson: Array<{
    id: string;
    prompt: string;
    options: [string, string, string, string];
  }> | null;
};

type ModuleWithLessons = {
  id: string;
  slug: string;
  number: string;
  title: string;
  durationLabel: string;
  lessons: Lesson[];
};

export function PlayerClient({
  training,
  modules,
  currentModuleSlug,
  currentLessonSlug,
  enrollmentId,
  progressJson: initialProgress,
}: {
  training: {
    slug: string;
    title: string;
    instructorName: string;
    monogram: string;
    tileColor: string;
  };
  modules: ModuleWithLessons[];
  currentModuleSlug: string;
  currentLessonSlug: string;
  enrollmentId: string;
  progressJson: Record<string, { completedAt: string; score?: number }>;
}) {
  const router = useRouter();
  const [progress, setProgress] = useState(initialProgress);

  const flat = useMemo(
    () =>
      modules.flatMap((m) =>
        m.lessons.map((l) => ({ ...l, moduleSlug: m.slug, moduleId: m.id })),
      ),
    [modules],
  );

  const currentIdx = flat.findIndex(
    (l) => l.moduleSlug === currentModuleSlug && l.slug === currentLessonSlug,
  );
  const current = flat[currentIdx] ?? flat[0];
  const next = currentIdx >= 0 ? flat[currentIdx + 1] : undefined;

  const onLessonComplete = (lessonId: string, score?: number) => {
    setProgress((p) => ({
      ...p,
      [lessonId]: {
        completedAt: new Date().toISOString(),
        ...(score !== undefined ? { score } : {}),
      },
    }));
  };

  const onNext = () => {
    if (next) {
      router.push(
        `/trainings/${training.slug}/learn/${next.moduleSlug}/${next.slug}?enrollment=${enrollmentId}`,
      );
    } else {
      router.push("/trainings/my-trainings");
    }
  };

  const doneCount = flat.filter((l) => progress[l.id]).length;
  const overallPct = flat.length > 0 ? Math.round((doneCount / flat.length) * 100) : 0;

  if (!current) {
    return (
      <div className="min-h-screen" style={{ background: "#101820" }}>
        <div className="flex h-screen items-center justify-center">
          <p style={{ color: "rgba(255,255,255,0.6)" }}>No lessons found.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--brand-black, #101820)" }}
    >
      <PlayerBar
        trainingTitle={training.title}
        trainingSlug={training.slug}
        moduleNumber={modules.find((m) => m.slug === currentModuleSlug)?.number ?? ""}
        moduleTitle={modules.find((m) => m.slug === currentModuleSlug)?.title ?? ""}
        overallPct={overallPct}
      />
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[1fr_320px]">
        <main>
          {current.kind === "video" && (
            <LessonVideo
              lesson={current}
              enrollmentId={enrollmentId}
              isComplete={!!progress[current.id]}
              onComplete={() => onLessonComplete(current.id)}
              onNext={onNext}
              hasNext={!!next}
            />
          )}
          {current.kind === "practice" && (
            <LessonPractice
              lesson={current}
              enrollmentId={enrollmentId}
              isComplete={!!progress[current.id]}
              onComplete={() => onLessonComplete(current.id)}
              onNext={onNext}
              hasNext={!!next}
            />
          )}
          {current.kind === "quiz" && (
            <LessonQuiz
              lesson={current}
              enrollmentId={enrollmentId}
              isComplete={!!progress[current.id]}
              priorScore={progress[current.id]?.score}
              onComplete={(score) => onLessonComplete(current.id, score)}
              onNext={onNext}
              hasNext={!!next}
            />
          )}
        </main>
        <PlayerSidebar
          modules={modules}
          currentLessonId={current.id}
          progressJson={progress}
          buildHref={(moduleSlug, lessonSlug) =>
            `/trainings/${training.slug}/learn/${moduleSlug}/${lessonSlug}?enrollment=${enrollmentId}`
          }
        />
      </div>
    </div>
  );
}
