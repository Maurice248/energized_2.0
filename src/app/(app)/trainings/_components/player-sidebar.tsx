import Link from "next/link";
import { Check, FileText, Target, Video } from "lucide-react";

const KIND_ICON = {
  video: Video,
  practice: Target,
  quiz: FileText,
};

type Lesson = {
  id: string;
  slug: string;
  title: string;
  kind: "video" | "practice" | "quiz";
  durationLabel: string;
};

type Module = {
  id: string;
  slug: string;
  number: string;
  title: string;
  durationLabel: string;
  lessons: Lesson[];
};

export function PlayerSidebar({
  modules,
  currentLessonId,
  progressJson,
  buildHref,
}: {
  modules: Module[];
  currentLessonId: string;
  progressJson: Record<string, { completedAt: string; score?: number }>;
  buildHref: (moduleSlug: string, lessonSlug: string) => string;
}) {
  return (
    <aside
      className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {modules.map((m) => (
        <div key={m.id} className="border-b border-white/10 last:border-b-0">
          <div className="px-5 py-3">
            <div
              className="text-[11px] font-bold uppercase tracking-[0.12em]"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              Module {m.number}
            </div>
            <div className="mt-0.5 text-sm font-bold" style={{ color: "#fff" }}>
              {m.title}
            </div>
          </div>
          <ul>
            {m.lessons.map((l) => {
              const Icon = KIND_ICON[l.kind];
              const isCurrent = l.id === currentLessonId;
              const isDone = !!progressJson[l.id];
              return (
                <li key={l.id}>
                  <Link
                    href={buildHref(m.slug, l.slug)}
                    className="flex items-center gap-3 px-5 py-2.5 text-sm transition"
                    style={{
                      color: isCurrent ? "#fff" : "rgba(255,255,255,0.7)",
                      background: isCurrent ? "rgba(28,170,226,0.1)" : "transparent",
                      borderLeft: isCurrent
                        ? "2px solid var(--brand-blue, #1CAAE2)"
                        : "2px solid transparent",
                    }}
                  >
                    {isDone ? (
                      <span
                        className="grid h-4 w-4 flex-shrink-0 place-items-center rounded-full"
                        style={{
                          background: "var(--brand-blue, #1CAAE2)",
                          color: "var(--brand-black, #101820)",
                        }}
                      >
                        <Check className="h-2.5 w-2.5" strokeWidth={3} />
                      </span>
                    ) : (
                      <Icon
                        className="h-4 w-4 flex-shrink-0"
                        style={{ color: "rgba(255,255,255,0.5)" }}
                      />
                    )}
                    <span className="flex-1 truncate">{l.title}</span>
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                      {l.durationLabel}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </aside>
  );
}
