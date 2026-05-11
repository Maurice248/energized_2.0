"use client";

type Lesson = {
  id: string;
  title: string;
  quizQuestionsJson: Array<{
    id: string;
    prompt: string;
    options: [string, string, string, string];
  }> | null;
};

export function LessonQuiz({
  lesson,
}: {
  lesson: Lesson;
  enrollmentId: string;
  isComplete: boolean;
  priorScore?: number;
  onComplete: (score: number) => void;
  onNext: () => void;
  hasNext: boolean;
}) {
  return <div className="text-white">Quiz lesson: {lesson.title} (stub)</div>;
}
