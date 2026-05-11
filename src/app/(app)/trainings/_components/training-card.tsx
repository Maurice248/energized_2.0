import Link from "next/link";
import { ArrowRight, Clock, Users } from "lucide-react";

export type CardTraining = {
  slug: string;
  title: string;
  shortBlurb: string;
  sector: string;
  monogram: string;
  tileColor: string;
  hours: number;
  durationLabel: string;
  level: string;
  isNew: boolean;
  isFeatured: boolean;
};

const LEVEL_LABEL: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  all: "All levels",
};

export function TrainingCard({ training }: { training: CardTraining }) {
  return (
    <Link
      href={`/trainings/${training.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border-2 border-slate-300 bg-white p-6 transition hover:-translate-y-0.5 hover:border-[var(--brand-black,#101820)] hover:shadow-xl"
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className="grid h-14 w-14 place-items-center rounded-2xl text-xl font-bold text-white"
          style={{ background: training.tileColor }}
        >
          {training.monogram}
        </div>
        <div className="flex items-center gap-2">
          {training.isNew && (
            <span
              className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]"
              style={{ background: "var(--brand-blue, #1CAAE2)", color: "var(--brand-black, #101820)" }}
            >
              New
            </span>
          )}
          <div className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-500 transition group-hover:border-[var(--brand-blue,#1CAAE2)] group-hover:bg-[var(--brand-blue,#1CAAE2)] group-hover:text-[var(--brand-black,#101820)] group-hover:[transform:rotate(-45deg)]">
            <ArrowRight className="h-4 w-4" />
          </div>
        </div>
      </div>
      <h3 className="mt-5 text-xl font-bold tracking-tight">{training.title}</h3>
      <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-slate-600">
        {training.shortBlurb}
      </p>
      <div className="mt-5 flex items-center justify-between border-t border-dashed border-slate-200 pt-4 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          {training.durationLabel}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          {LEVEL_LABEL[training.level] ?? training.level}
        </span>
      </div>
    </Link>
  );
}
