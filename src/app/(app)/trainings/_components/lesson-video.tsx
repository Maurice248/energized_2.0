"use client";

type Lesson = {
  id: string;
  title: string;
  durationLabel: string;
  videoUrl: string | null;
  videoProvider: string | null;
};

export function LessonVideo({
  lesson,
}: {
  lesson: Lesson;
  enrollmentId: string;
  isComplete: boolean;
  onComplete: () => void;
  onNext: () => void;
  hasNext: boolean;
}) {
  return <div className="text-white">Video lesson: {lesson.title} (stub)</div>;
}
