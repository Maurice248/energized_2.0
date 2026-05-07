import type { PlanTier } from "@/lib/billing-tiers";

/* ---------------------------------------------------------------------------
 * Pure types + functions for plan-card CTAs. No server-only or env imports —
 * safe to consume from `"use client"` components.
 *
 * `ViewerContext` is produced by `getViewerContext()` (server-only) and
 * passed to client components as a serialized prop.
 * --------------------------------------------------------------------------- */

export type EmployerPlanKey = PlanTier | "none";
export type JobseekerPlanKey = "free" | "gold" | "platinum";

export type ViewerContext = {
  isAuthenticated: boolean;
  /** Better Auth `user.role`. May include `recruiter`/`admin` for org members. */
  role: "jobseeker" | "employer" | "recruiter" | "admin" | null;
  /** Current employer plan; "none" = no active subscription; null = role mismatch. */
  employerPlan: EmployerPlanKey | null;
  /** Current jobseeker plan; null = role mismatch. Phase B will read DB. */
  jobseekerPlan: JobseekerPlanKey | null;
};

export type CardCta = {
  label: string;
  href: string;
  disabled: boolean;
  tooltip?: string;
  isCurrentPlan: boolean;
};

/**
 * Pure function — given a plan card and the viewer's context, returns the
 * label/href/disabled state the card should render.
 *
 * Plan IDs match `DisplayPlan.id`:
 *   - "jobseeker_free" | "jobseeker_gold" | "jobseeker_platinum"
 *   - "employer_free" | "package_a" | "package_b" | "package_c"
 */
export function computeCardCta(args: {
  audience: "jobseeker" | "employer";
  planId: string;
  defaultHref: string;
  defaultLabel: string;
  viewer: ViewerContext;
}): CardCta {
  const { audience, planId, defaultHref, defaultLabel, viewer } = args;

  // ── Not signed in: ALL cards send the user to sign-up with plan pre-selected.
  if (!viewer.isAuthenticated) {
    return {
      label: defaultLabel,
      href: defaultHref,
      disabled: false,
      isCurrentPlan: false,
    };
  }

  // ── Signed in with wrong role: disable with explanatory tooltip.
  const userIsEmployerSide =
    viewer.role === "employer" ||
    viewer.role === "recruiter" ||
    viewer.role === "admin";
  const userIsJobseeker = viewer.role === "jobseeker";

  if (audience === "employer" && !userIsEmployerSide) {
    return {
      label: "Employer account required",
      href: "#",
      disabled: true,
      tooltip:
        "You're signed in as a job seeker. Sign out and create an employer account to subscribe.",
      isCurrentPlan: false,
    };
  }
  if (audience === "jobseeker" && !userIsJobseeker) {
    return {
      label: "Job-seeker account required",
      href: "#",
      disabled: true,
      tooltip:
        "You're signed in as an employer. Sign out and create a job-seeker account to subscribe.",
      isCurrentPlan: false,
    };
  }

  // ── Signed in with correct role: surface current plan or route to checkout.
  if (audience === "employer") {
    const cardPlanKey: EmployerPlanKey =
      planId === "employer_free" ? "none" : (planId as PlanTier);
    const isCurrent = cardPlanKey === viewer.employerPlan;

    if (isCurrent) {
      return {
        label: "Current plan",
        href: "/employer/profile#ep-billing",
        disabled: false,
        isCurrentPlan: true,
      };
    }
    if (planId === "employer_free") {
      return {
        label: "Manage in billing",
        href: "/employer/profile#ep-billing",
        disabled: false,
        isCurrentPlan: false,
      };
    }
    // Paid tier → billing page reads `?subscribe=` and auto-triggers checkout.
    return {
      label: defaultLabel,
      href: `/employer/profile?subscribe=${planId}#ep-billing`,
      disabled: false,
      isCurrentPlan: false,
    };
  }

  // audience === "jobseeker"
  const cardPlanKey: JobseekerPlanKey | null =
    planId === "jobseeker_free"
      ? "free"
      : planId === "jobseeker_gold"
        ? "gold"
        : planId === "jobseeker_platinum"
          ? "platinum"
          : null;
  const isCurrent =
    cardPlanKey !== null && cardPlanKey === viewer.jobseekerPlan;

  if (isCurrent) {
    return {
      label: "Current plan",
      href: "/profile#pp-billing",
      disabled: false,
      isCurrentPlan: true,
    };
  }
  if (planId === "jobseeker_free") {
    return {
      label: "Manage in billing",
      href: "/profile#pp-billing",
      disabled: false,
      isCurrentPlan: false,
    };
  }
  // Paid jobseeker tier → /profile reads `?subscribe=` and auto-triggers checkout.
  const tierKey =
    planId === "jobseeker_gold" ? "gold" : "platinum";
  return {
    label: defaultLabel,
    href: `/profile?subscribe=${tierKey}#pp-billing`,
    disabled: false,
    isCurrentPlan: false,
  };
}
