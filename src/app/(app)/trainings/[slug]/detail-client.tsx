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

export function DetailClient({
  training,
  modules,
  isPlatinum,
  isSignedIn,
}: {
  training: Training;
  modules: ModuleWithLessons[];
  isPlatinum: boolean;
  isSignedIn: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const enrollMut = api.trainings.enroll.useMutation({
    onSuccess: (data) => {
      const firstModule = modules[0];
      const firstLesson = firstModule?.lessons[0];
      if (firstModule && firstLesson) {
        router.push(
          `/trainings/${training.slug}/learn/${firstModule.slug}/${firstLesson.slug}?enrollment=${data.enrollmentId}`,
        );
      } else {
        router.push("/trainings/my-trainings");
      }
    },
    onError: (e) => setError(e.message),
  });

  const onEnroll = () => {
    if (!isSignedIn) {
      router.push(`/sign-in?redirect=/trainings/${training.slug}`);
      return;
    }
    if (!isPlatinum) {
      // Take them straight to the billing section instead of a 2-step banner.
      router.push("/profile#pp-billing");
      return;
    }
    enrollMut.mutate({ slug: training.slug });
  };

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
        ctaLabel={
          enrollMut.isPending
            ? "Enrolling…"
            : !isPlatinum
              ? "Upgrade to Platinum"
              : "Enroll free"
        }
        ctaDisabled={enrollMut.isPending}
      />
      <DetailCurriculum modules={modules} />
      <DetailUnlocks unlocks={training.unlocksJson} />
      <DetailReviews />
    </>
  );
}
