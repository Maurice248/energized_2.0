"use client";

import { useEffect, useRef } from "react";
import { authClient } from "@/lib/auth/client";
import { api } from "@/lib/trpc/client";
import {
  ONBOARDING_DRAFT_KEY,
  ONBOARDING_DRAFT_TTL_MS,
  onboardingDraftSchema,
} from "@/lib/onboarding";

export function OnboardingPersister() {
  const session = authClient.useSession();
  const utils = api.useUtils();
  const complete = api.onboarding.completeOnboarding.useMutation();
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    if (session.isPending || !session.data?.user) return;

    const raw = localStorage.getItem(ONBOARDING_DRAFT_KEY);
    if (!raw) return;

    attempted.current = true;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      localStorage.removeItem(ONBOARDING_DRAFT_KEY);
      return;
    }

    const stored = parsed as {
      savedAt?: number;
      forUserEmail?: string;
      draft?: unknown;
    };
    if (
      typeof stored.savedAt !== "number" ||
      Date.now() - stored.savedAt > ONBOARDING_DRAFT_TTL_MS
    ) {
      localStorage.removeItem(ONBOARDING_DRAFT_KEY);
      return;
    }

    const sessionEmail = session.data.user.email;
    if (
      typeof stored.forUserEmail !== "string" ||
      stored.forUserEmail.toLowerCase() !== sessionEmail.toLowerCase()
    ) {
      // Draft was saved for a different user (or untagged legacy draft).
      // Clear it so it can't leak into the current session's profile.
      localStorage.removeItem(ONBOARDING_DRAFT_KEY);
      return;
    }

    const draft = onboardingDraftSchema.safeParse(stored.draft);
    if (!draft.success) {
      localStorage.removeItem(ONBOARDING_DRAFT_KEY);
      return;
    }

    complete.mutate(draft.data, {
      onSuccess: () => {
        localStorage.removeItem(ONBOARDING_DRAFT_KEY);
        // Invalidate both views so whichever wizard mounted refetches its
        // freshly-created source of truth.
        void utils.profile.get.invalidate();
        void utils.employer.getMyOrg.invalidate();
      },
      onError: () => {
        attempted.current = false;
      },
    });
  }, [session.isPending, session.data?.user, complete, utils]);

  return null;
}
