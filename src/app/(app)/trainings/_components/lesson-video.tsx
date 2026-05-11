"use client";
import { ArrowRight, Check, PlayCircle } from "lucide-react";
import { api } from "@/lib/trpc/client";

type Lesson = {
  id: string;
  title: string;
  durationLabel: string;
  videoUrl: string | null;
  videoProvider: string | null;
};

function buildEmbed(videoUrl: string | null, provider: string | null): string | null {
  if (!videoUrl) return null;
  if (provider === "youtube") {
    const match = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/);
    const id = match ? match[1] : videoUrl;
    return `https://www.youtube.com/embed/${id}?rel=0`;
  }
  if (provider === "vimeo") {
    const match = videoUrl.match(/vimeo\.com\/(\d+)/);
    const id = match ? match[1] : videoUrl;
    return `https://player.vimeo.com/video/${id}`;
  }
  return videoUrl;
}

export function LessonVideo({
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
  const embedSrc = buildEmbed(lesson.videoUrl, lesson.videoProvider);
  const mut = api.trainings.markLessonComplete.useMutation({
    onSuccess: () => onComplete(),
  });

  return (
    <div>
      <div
        className="aspect-video w-full overflow-hidden rounded-2xl"
        style={{ background: "rgba(255,255,255,0.04)" }}
      >
        {embedSrc ? (
          <iframe
            src={embedSrc}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={lesson.title}
          />
        ) : (
          <div
            className="flex h-full flex-col items-center justify-center gap-3 text-center"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            <PlayCircle className="h-16 w-16" style={{ color: "rgba(255,255,255,0.3)" }} />
            <div className="text-sm">Video coming soon — content authored separately.</div>
          </div>
        )}
      </div>
      <h1
        className="mt-6 text-2xl font-bold tracking-tight md:text-3xl"
        style={{ color: "#fff" }}
      >
        {lesson.title}
      </h1>
      <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
        Duration: {lesson.durationLabel}
      </p>
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
