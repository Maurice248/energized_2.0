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
export const EVENT_JOB_SAVED = "job.saved";
export const EVENT_JOB_UNSAVED = "job.unsaved";

// Job lifecycle (employer wizard)
export const EVENT_JOB_DRAFT_CREATED = "job.draft.created";
export const EVENT_JOB_DRAFT_UPDATED = "job.draft.updated";
export const EVENT_JOB_PUBLISHED = "job.published";
export const EVENT_JOB_CLOSED = "job.closed";
export const EVENT_JOB_REOPENED = "job.reopened";
export const EVENT_JOB_WIZARD_STEP_VIEWED = "job.wizard.step_viewed";

// Applications
export const EVENT_APPLICATION_SUBMITTED = "application.submitted";
export const EVENT_APPLICATION_STATUS_CHANGED = "application.status_changed";

// Billing
export const EVENT_BILLING_SUBSCRIPTION_STARTED = "billing.subscription.started";
export const EVENT_BILLING_SUBSCRIPTION_CANCELLED = "billing.subscription.cancelled";

// Intro Requests
export const EVENT_INTRO_REQUESTED = "intro.requested";
export const EVENT_INTRO_ACCEPTED = "intro.accepted";
export const EVENT_INTRO_DECLINED = "intro.declined";
export const EVENT_INTRO_CANCELED = "intro.canceled";
export const EVENT_INTRO_CONTACT_UNLOCKED_VIEWED = "intro.contact_unlocked.viewed";

// Profile
export const EVENT_PROFILE_UPDATED = "profile.updated";
export const EVENT_RESUME_UPLOADED = "resume.uploaded";
export const EVENT_RESUME_AUTOFILL_PREVIEWED = "resume.autofill.previewed";
export const EVENT_RESUME_AUTOFILL_APPLIED = "resume.autofill.applied";
