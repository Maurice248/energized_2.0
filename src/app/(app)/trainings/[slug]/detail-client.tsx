"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/trpc/client";
import { DetailHero } from "@/app/(app)/trainings/_components/detail-hero";
import { DetailCurriculum } from "@/app/(app)/trainings/_components/detail-curriculum";
import { DetailReviews } from "@/app/(app)/trainings/_components/detail-reviews";
import { DetailUnlocks } from "@/app/(app)/trainings/_components/detail-unlocks";

type Training = {
  id: string;
  slug: string;
  title: string;
  longBlurb: string;
  hours: number;
  durationLabel: string;
  level: string;
  monogram: string;
  tileColor: string;
  certName: string | null;
  instructorName: string;
  instructorRole: string;
  outcomesJson: string[];
  unlocksJson: { role: string; co: string; band: string }[];
};

type ModuleWithLessons = {
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

type ExistingEnrollment = {
  id: string;
  status: string;
  progressJson: Record<string, { completedAt: string; score?: number }>;
};

export function DetailClient({
  training,
  modules,
  isPlatinum,
  isSignedIn,
  existingEnrollment,
}: {
  training: Training;
  modules: ModuleWithLessons[];
  isPlatinum: boolean;
  isSignedIn: boolean;
  existingEnrollment: ExistingEnrollment | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  // Find the first lesson the user hasn't completed yet — used to deep-link
  // "Continue" to wherever they left off. Falls back to the first lesson.
  const findNextLesson = () => {
    const progress = existingEnrollment?.progressJson ?? {};
    for (const m of modules) {
      for (const l of m.lessons) {
        if (!progress[l.id]) return { module: m, lesson: l };
      }
    }
    return modules[0]
      ? { module: modules[0], lesson: modules[0].lessons[0] }
      : null;
  };

  const enrollMut = api.trainings.enroll.useMutation({
    onSuccess: (data) => {
      const target = findNextLesson();
      if (target?.module && target?.lesson) {
        router.push(
          `/trainings/${training.slug}/learn/${target.module.slug}/${target.lesson.slug}?enrollment=${data.enrollmentId}`,
        );
      } else {
        router.push("/trainings/my-trainings");
      }
    },
    onError: (e) => setError(e.message),
  });

  const isCompleted = existingEnrollment?.status === "completed";
  const isEnrolled = !!existingEnrollment;

  const onEnroll = () => {
    if (!isSignedIn) {
      router.push(`/sign-in?redirect=/trainings/${training.slug}`);
      return;
    }
    if (!isPlatinum) {
      // Hard navigation (not router.push) so the browser honors the
      // #pp-billing hash and scrolls to the billing section. Next.js
      // client routing doesn't reliably re-scroll on first paint when
      // the target lives inside a useQuery-gated component.
      window.location.href = "/profile#pp-billing";
      return;
    }
    // Already enrolled — go to the next lesson (or cert if fully completed).
    if (existingEnrollment) {
      if (isCompleted) {
        router.push(
          `/trainings/${training.slug}/certificate?enrollment=${existingEnrollment.id}`,
        );
        return;
      }
      const target = findNextLesson();
      if (target?.module && target?.lesson) {
        router.push(
          `/trainings/${training.slug}/learn/${target.module.slug}/${target.lesson.slug}?enrollment=${existingEnrollment.id}`,
        );
        return;
      }
    }
    enrollMut.mutate({ slug: training.slug });
  };

  const ctaLabel = enrollMut.isPending
    ? "Enrolling…"
    : !isPlatinum
      ? "Upgrade to Platinum"
      : isCompleted
        ? "View certificate"
        : isEnrolled
          ? "Continue learning"
          : "Enroll free";

  return (
    <>
      {error && (
        <div
          ref={(el) => el?.scrollIntoView({ behavior: "smooth", block: "start" })}
          className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div className="flex-1 leading-relaxed">
            {error.startsWith("paywall:") ? (
              <>
                Trainings are a Platinum feature. Upgrade to enroll, get certificates, and surface
                verified badges to recruiters.{" "}
                <Link
                  href="/profile#pp-billing"
                  className="font-bold underline underline-offset-2 hover:text-amber-950"
                >
                  Upgrade to Platinum →
                </Link>
              </>
            ) : (
              error
            )}
          </div>
        </div>
      )}
      <DetailHero
        training={training}
        moduleCount={modules.length}
        lessonCount={modules.reduce((n, m) => n + m.lessons.length, 0)}
        onEnroll={onEnroll}
        ctaLabel={ctaLabel}
        ctaDisabled={enrollMut.isPending}
      />
      <DetailCurriculum modules={modules} />
      <DetailUnlocks unlocks={training.unlocksJson} />
      <DetailReviews />
    </>
  );
}
