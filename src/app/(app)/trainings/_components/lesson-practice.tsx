"use client";

type Lesson = {
  id: string;
  title: string;
  practiceMarkdown: string | null;
};

export function LessonPractice({
  lesson,
}: {
  lesson: Lesson;
  enrollmentId: string;
  isComplete: boolean;
  onComplete: () => void;
  onNext: () => void;
  hasNext: boolean;
}) {
  return <div className="text-white">Practice lesson: {lesson.title} (stub)</div>;
}
