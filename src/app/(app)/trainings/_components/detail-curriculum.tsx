"use client";
import { useState } from "react";
import { ChevronDown, FileText, Target, Video } from "lucide-react";

type Module = {
  id: string;
  slug: string;
  number: string;
  title: string;
  durationLabel: string;
  lessons: Array<{
    id: string;
    slug: string;
    title: string;
    kind: "video" | "practice" | "quiz";
    durationLabel: string;
  }>;
};

const KIND_ICON = {
  video: Video,
  practice: Target,
  quiz: FileText,
};

export function DetailCurriculum({ modules }: { modules: Module[] }) {
  const [open, setOpen] = useState<string | null>(modules[0]?.id ?? null);

  return (
    <section className="mt-12">
      <h2 className="text-3xl font-bold tracking-tight">Curriculum</h2>
      <p className="mt-2 text-sm text-slate-600">
        {modules.length} module{modules.length === 1 ? "" : "s"} &middot;{" "}
        {modules.reduce((n, m) => n + m.lessons.length, 0)} lessons
      </p>
      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3">
        {modules.map((m) => {
          const isOpen = open === m.id;
          return (
            <div
              key={m.id}
              className="overflow-hidden rounded-xl border border-slate-200 mt-2 first:mt-0"
            >
              <button
                onClick={() => setOpen(isOpen ? null : m.id)}
                className="flex w-full items-center gap-4 px-6 py-5 text-left transition hover:bg-slate-50"
              >
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  {m.number}
                </span>
                <span className="flex-1 text-base font-bold text-slate-900">{m.title}</span>
                <span className="text-xs text-slate-500">{m.durationLabel}</span>
                <ChevronDown
                  className={`h-4 w-4 text-slate-400 transition ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isOpen && (
                <ul className="border-t border-slate-100 bg-slate-50/50 px-6 py-3">
                  {m.lessons.map((l) => {
                    const Icon = KIND_ICON[l.kind];
                    return (
                      <li
                        key={l.id}
                        className="flex items-center gap-3 py-2 text-sm text-slate-700"
                      >
                        <Icon className="h-3.5 w-3.5 text-slate-400" />
                        <span className="flex-1">{l.title}</span>
                        <span className="text-xs text-slate-500">{l.durationLabel}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
