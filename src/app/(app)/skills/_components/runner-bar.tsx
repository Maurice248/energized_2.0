"use client";
import { Clock, X } from "lucide-react";

export function RunnerBar({
  current,
  total,
  answeredCount,
  secondsLeft,
  onQuit,
}: {
  current: number;
  total: number;
  answeredCount: number;
  secondsLeft: number;
  onQuit: () => void;
}) {
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const progressPct = Math.round((answeredCount / total) * 100);
  const warn = secondsLeft < 120;

  return (
    <div className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/90 backdrop-blur-md">
      <div className="mx-auto grid h-18 max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-6 px-4 py-3">
        <button
          onClick={onQuit}
          className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-700 hover:border-[var(--brand-black)]"
        >
          <X className="h-4 w-4" /> Quit
        </button>
        <div className="flex items-center gap-3.5">
          <span className="whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
            <strong className="text-lg font-normal tracking-tight text-[var(--brand-black)]">
              {current}
            </strong>{" "}
            / {total}
          </span>
          <div className="h-1.5 w-48 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full bg-[var(--brand-black)] transition-[width] duration-200"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
            {answeredCount} answered
          </span>
        </div>
        <div
          className={`ml-auto inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium ${
            warn
              ? "border-amber-300 bg-amber-50 text-amber-900"
              : "border-slate-200 bg-white text-slate-900"
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
        </div>
      </div>
    </div>
  );
}
