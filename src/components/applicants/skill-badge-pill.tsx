import { Check } from "lucide-react";

export function SkillBadgePill({
  topicName,
  isVerifiedTop,
}: {
  topicName: string;
  isVerifiedTop: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
        isVerifiedTop
          ? "bg-[var(--brand-blue)] text-[var(--brand-black)]"
          : "border border-slate-200 bg-white text-slate-700"
      }`}
    >
      <span
        className={`grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full ${
          isVerifiedTop
            ? "bg-[var(--brand-black)] text-[var(--brand-blue)]"
            : "bg-[var(--brand-blue)] text-[var(--brand-black)]"
        }`}
      >
        <Check className="h-2.5 w-2.5" strokeWidth={3} />
      </span>
      {topicName}
    </span>
  );
}
