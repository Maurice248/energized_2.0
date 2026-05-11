"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-white"
    >
      Print
    </button>
  );
}
