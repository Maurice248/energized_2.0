"use client";

import { useEffect, useRef } from "react";
import { authClient } from "@/lib/auth/client";
import { api } from "@/lib/trpc/client";
import {
  ONBOARDING_DRAFT_KEY,
  ONBOARDING_DRAFT_TTL_MS,
  type OnboardingDraft,
  onboardingDraftSchema,
} from "@/lib/onboarding";

/**
 * Where to send the user after they finish the onboarding wizard, based on
 * the plan they picked at sign-up. Returns null when no redirect is needed
 * (free tier).
 *
 * The destination pages (`/profile` and `/employer/profile`) show a
 * "Confirm subscription / Pay later" panel — see Phase C.
 */
export function postOnboardingRedirect(draft: OnboardingDraft): string | null {
  if (draft.role === "jobseeker") {
    if (draft.plan === "jobseeker_gold") {
      return "/profile?subscribe=gold#pp-billing";
    }
    if (draft.plan === "jobseeker_platinum") {
      return "/profile?subscribe=platinum#pp-billing";
    }
    return null;
  }
  if (
    draft.plan === "package_a" ||
    draft.plan === "package_b" ||
    draft.plan === "package_c"
  ) {
    return `/employer/profile?subscribe=${draft.plan}#ep-billing`;
  }
  return null;
}

/**
 * Localstorage key that defers the post-wizard billing redirect. Set by the
 * persister after `completeOnboarding` succeeds for a paid plan. Read and
 * cleared by each wizard's "Finish" step so the user runs the wizard first
 * and only then lands on billing.
 */
export const PENDING_BILLING_REDIRECT_KEY = "energized:pending-billing-redirect";

/** Pop the pending billing redirect (read + remove). Safe on SSR (returns null). */
export function consumePendingBillingRedirect(): string | null {
  if (typeof window === "undefined") return null;
  const url = localStorage.getItem(PENDING_BILLING_REDIRECT_KEY);
  if (url) localStorage.removeItem(PENDING_BILLING_REDIRECT_KEY);
  return url;
}

/** Read the pending billing redirect WITHOUT removing it. Safe on SSR. */
export function peekPendingBillingRedirect(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PENDING_BILLING_REDIRECT_KEY);
}

export type PendingBillingChoice =
  | {
      audience: "jobseeker";
      tier: "gold" | "platinum";
      label: string;
    }
  | {
      audience: "employer";
      tier: "package_a" | "package_b" | "package_c";
      label: string;
    };

/** Parse a redirect URL produced by `postOnboardingRedirect` back into its parts. */
export function parsePendingBillingChoice(
  url: string | null,
): PendingBillingChoice | null {
  if (!url) return null;
  const match = url.match(/\?subscribe=([^&#]+)/);
  if (!match) return null;
  const tier = match[1];
  switch (tier) {
    case "gold":
      return { audience: "jobseeker", tier, label: "Gold" };
    case "platinum":
      return { audience: "jobseeker", tier, label: "Platinum" };
    case "package_a":
      return { audience: "employer", tier, label: "Package A" };
    case "package_b":
      return { audience: "employer", tier, label: "Package B" };
    case "package_c":
      return { audience: "employer", tier, label: "Package C" };
    default:
      return null;
  }
}

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

        // If the user picked a paid plan during sign-up, defer the billing
        // redirect to the end of the onboarding wizard. The wizard's Finish
        // step will read `consumePendingBillingRedirect()` and route there.
        const redirect = postOnboardingRedirect(draft.data);
        if (redirect) {
          localStorage.setItem(PENDING_BILLING_REDIRECT_KEY, redirect);
        }
      },
      onError: () => {
        attempted.current = false;
      },
    });
  }, [session.isPending, session.data?.user, complete, utils]);

  return null;
}
