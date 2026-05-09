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

  // Cooldowns by topic slug → { status, daysLeft }. Used to grey out
  // role pills that are blocked, and to pick a sensible default role.
  const cooldownsQuery = api.skillTests.myActiveCooldowns.useQuery(undefined, {
    retry: false,
  });
  const cooldowns: Record<string, { status: string; daysLeft: number }> =
    Object.fromEntries(
      (cooldownsQuery.data ?? []).map((c) => [
        c.slug,
        { status: c.status, daysLeft: c.daysLeft },
      ]),
    );

  const firstAvailableSlug =
    roles.find((r) => !cooldowns[r.slug])?.slug ?? roles[0]?.slug ?? sector.slug;
  const defaultRoleSlug =
    initialRoleSlug && !cooldowns[initialRoleSlug]
      ? initialRoleSlug
      : firstAvailableSlug;

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
          <div
            ref={(el) => el?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <div className="flex-1 leading-relaxed">
              <div>{formatErrorMessage(error)}</div>
              {error.startsWith("cooldown:") && (
                <div className="mt-2">
                  Want to test something else?{" "}
                  <Link
                    href="/skills"
                    className="font-bold underline underline-offset-2 hover:text-amber-950"
                  >
                    Browse other sectors →
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
        <ConfigureForm
          sector={sector}
          roles={roles}
          initialRoleSlug={defaultRoleSlug}
          cooldowns={cooldowns}
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

function formatErrorMessage(raw: string): string {
  if (raw.startsWith("paywall:")) {
    return "You've used your free skill test. Upgrade to Gold to take more.";
  }
  // cooldown:7d:3 → 7-day window, 3 days remaining (failed attempt)
  // cooldown:30d:12 → 30-day window, 12 days remaining (passed attempt)
  const cooldown = /^cooldown:(7d|30d):(\d+)$/.exec(raw);
  if (cooldown) {
    const window = cooldown[1];
    const daysLeft = Number(cooldown[2]);
    const reason =
      window === "30d"
        ? "You've already earned a badge for this topic"
        : "Take a few days to study before trying again";
    const dayLabel = daysLeft === 1 ? "1 day" : `${daysLeft} days`;
    return `${reason}. You can retake this test in ${dayLabel}.`;
  }
  return raw;
}
