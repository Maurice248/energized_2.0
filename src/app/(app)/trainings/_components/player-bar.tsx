import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function PlayerBar({
  trainingTitle,
  trainingSlug,
  moduleNumber,
  moduleTitle,
  overallPct,
}: {
  trainingTitle: string;
  trainingSlug: string;
  moduleNumber: string;
  moduleTitle: string;
  overallPct: number;
}) {
  return (
    <div
      className="sticky top-0 z-10 backdrop-blur"
      style={{
        background: "rgba(16, 24, 32, 0.85)",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
        <Link
          href={`/trainings/${trainingSlug}`}
          className="inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-bold"
          style={{
            background: "rgba(255,255,255,0.08)",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          <ChevronLeft className="h-4 w-4" /> Exit
        </Link>
        <div className="flex-1 truncate text-sm" style={{ color: "rgba(255,255,255,0.85)" }}>
          <span className="font-bold">{trainingTitle}</span>
          {" · "}
          <span style={{ color: "rgba(255,255,255,0.5)" }}>
            Module {moduleNumber} · {moduleTitle}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
          <div
            className="h-1.5 w-32 overflow-hidden rounded-full"
            style={{ background: "rgba(255,255,255,0.1)" }}
          >
            <div
              className="h-full transition-[width] duration-500"
              style={{ width: `${overallPct}%`, background: "var(--brand-blue, #1CAAE2)" }}
            />
          </div>
          <span className="font-bold">{overallPct}%</span>
        </div>
      </div>
    </div>
  );
}
