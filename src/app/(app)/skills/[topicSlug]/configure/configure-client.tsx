"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, AlertCircle } from "lucide-react";
import posthog from "posthog-js";
import { api } from "@/lib/trpc/client";
import { ConfigureForm } from "@/app/(app)/skills/_components/configure-form";
import { GeneratingOverlay } from "@/app/(app)/skills/_components/generating-overlay";

type Topic = {
  id: string;
  slug: string;
  name: string;
  monogram: string;
  tileColor: string;
};

export function ConfigureClient({
  sector,
  roles,
  initialRoleSlug,
}: {
  sector: Topic;
  roles: { slug: string; name: string; subDescription: string | null }[];
  initialRoleSlug: string | null;
}) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    try {
      posthog.capture("skill_test.configure.viewed", { topicSlug: sector.slug });
    } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (error?.startsWith("paywall:")) {
      try {
        posthog.capture("skill_test.paywall.viewed", { topicSlug: sector.slug });
      } catch {}
    }
  }, [error]); // eslint-disable-line react-hooks/exhaustive-deps

  const startMut = api.skillTests.startAttempt.useMutation({
    onSuccess: (data) => {
      router.push(`/skills/${sector.slug}/attempt/${data.attemptId}`);
    },
    onError: (e) => {
      setGenerating(false);
      setError(e.message);
    },
  });

  return (
    <div className="fixed inset-0 z-50 animate-in fade-in slide-in-from-bottom-2 overflow-y-auto bg-slate-50 duration-200">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link
            href="/skills"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-700 hover:border-[var(--brand-black)]"
          >
            <ChevronLeft className="h-4 w-4" /> All sectors
          </Link>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
            <span>Step 01 / 03</span>
            <div className="flex gap-1.5">
              <span className="h-1 w-7 rounded-full bg-[var(--brand-black)]" />
              <span className="h-1 w-7 rounded-full bg-slate-200" />
              <span className="h-1 w-7 rounded-full bg-slate-200" />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-14">
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <AlertCircle className="h-5 w-5" />
            {error.startsWith("paywall:")
              ? "You've used your free skill test. Upgrade to Gold to take more."
              : error.startsWith("cooldown:")
                ? `You can't retake this topic yet — ${error}`
                : error}
          </div>
        )}
        <ConfigureForm
          sector={sector}
          roles={roles}
          initialRoleSlug={initialRoleSlug ?? roles[0]?.slug ?? sector.slug}
          submitting={startMut.isPending}
          onSubmit={(values) => {
            setError(null);
            setGenerating(true);
            try {
              posthog.capture("skill_test.attempt.started", {
                topicSlug: values.roleSlug,
                level: values.level,
                count: values.questionCount,
                scenarios: values.includeScenarios,
                calc: values.includeCalc,
              });
            } catch {}
            startMut.mutate({
              topicSlug: values.roleSlug,
              level: values.level,
              questionCount: values.questionCount,
              includeScenarios: values.includeScenarios,
              includeCalc: values.includeCalc,
              honorPledged: true,
            });
          }}
        />
      </div>

      {generating && <GeneratingOverlay sectorName={sector.name} />}
    </div>
  );
}
