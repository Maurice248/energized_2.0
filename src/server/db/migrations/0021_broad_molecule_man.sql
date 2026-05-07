ALTER TABLE "user" ADD COLUMN "jobseeker_plan" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "jobseeker_stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "jobseeker_stripe_subscription_id" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "jobseeker_subscription_status" "subscription_status" DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "jobseeker_current_period_start" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "jobseeker_current_period_end" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "jobseeker_cancel_at_period_end" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "jobseeker_cancellation_disposition" text;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_jobseeker_stripe_customer_id_unique" UNIQUE("jobseeker_stripe_customer_id");