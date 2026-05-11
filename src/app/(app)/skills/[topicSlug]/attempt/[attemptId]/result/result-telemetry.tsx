"use client";
import { useEffect } from "react";
import posthog from "posthog-js";

export function ResultTelemetry({
  topicSlug,
  score,
  status,
}: {
  topicSlug: string;
  score: number;
  status: string;
}) {
  useEffect(() => {
    try {
      posthog.capture("skill_test.attempt.submitted", { topicSlug, score, status });
      if (status === "passed" || status === "passed_top") {
        posthog.capture("skill_test.badge.earned", {
          topicSlug,
          score,
          isVerifiedTop: status === "passed_top",
        });
      }
    } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
