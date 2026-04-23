/**
 * PostHog event name registry.
 * Naming convention: domain.action.result
 * Keep all event names here to prevent taxonomy drift.
 */

// Auth
export const EVENT_AUTH_SIGN_UP_COMPLETED = "auth.sign_up.completed";
export const EVENT_AUTH_SIGN_IN_COMPLETED = "auth.sign_in.completed";
export const EVENT_AUTH_SIGN_OUT_COMPLETED = "auth.sign_out.completed";

// Jobs
export const EVENT_JOB_POSTED = "job.posted";
export const EVENT_JOB_VIEWED = "job.viewed";

// Applications
export const EVENT_APPLICATION_SUBMITTED = "application.submitted";

// Billing
export const EVENT_BILLING_SUBSCRIPTION_STARTED = "billing.subscription.started";
export const EVENT_BILLING_SUBSCRIPTION_CANCELLED = "billing.subscription.cancelled";

// Profile
export const EVENT_PROFILE_UPDATED = "profile.updated";
export const EVENT_RESUME_UPLOADED = "resume.uploaded";
