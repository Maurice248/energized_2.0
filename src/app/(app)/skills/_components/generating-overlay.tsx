"use client";
import { useEffect, useState } from "react";

export function GeneratingOverlay({ sectorName }: { sectorName: string }) {
  const lines = [
    `Sourcing ${sectorName.toLowerCase()} question bank…`,
    "Calibrating difficulty for your role and level…",
    "Adding mixed-format items, scenarios, calcs…",
    "Shuffling, anti-cheat seeding, finalizing…",
  ];
  const [step, setStep] = useState(0);
  useEffect(() => {
    const ts = lines.map((_, i) => setTimeout(() => setStep(i + 1), 700 + i * 850));
    return () => ts.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines.length]);

  return (
    <div className="fixed inset-0 z-[100] grid animate-in fade-in place-items-center bg-[var(--brand-black)]/95 backdrop-blur duration-200">
      <div className="w-[calc(100%-3rem)] max-w-lg p-10 text-center">
        <div className="relative mx-auto mb-8 h-44 w-44">
          <div className="absolute inset-0 animate-[spin_8s_linear_infinite] rounded-full border border-dashed border-[var(--brand-blue)]/30" />
          <div className="absolute inset-6 animate-[spin_12s_linear_infinite_reverse] rounded-full border border-dashed border-[var(--brand-blue)]/20" />
          <div className="absolute inset-12 animate-[spin_16s_linear_infinite] rounded-full border border-dashed border-[var(--brand-blue)]/15" />
          <div className="absolute left-1/2 top-1/2 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[var(--brand-blue)] text-2xl font-bold text-[var(--brand-black)] shadow-[0_0_60px_rgba(28,170,226,0.4)]">
            E
          </div>
        </div>
        <h2
          className="text-3xl font-bold tracking-tight md:text-4xl"
          style={{ color: "#fff" }}
        >
          Building your test,{" "}
          <em
            className="not-italic italic"
            style={{ color: "var(--brand-blue, #1CAAE2)" }}
          >
            just for you
          </em>
          .
        </h2>
        <p className="mt-3 text-sm text-slate-300">Fresh question set — no two attempts are the same.</p>
        <div className="mt-7 min-h-[120px] rounded-xl border border-white/10 bg-white/[0.04] p-4 text-left text-xs leading-relaxed text-slate-300">
          {lines.map((l, i) => (
            <div key={i} className="flex gap-2.5">
              <span className={i < step ? "text-[var(--brand-blue)]" : "animate-pulse text-slate-400"}>
                {i < step ? "✓" : "○"}
              </span>
              <span style={{ opacity: i > step ? 0.6 : 1 }}>{l}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
