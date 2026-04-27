CREATE TYPE "public"."subscription_status" AS ENUM('none', 'active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid');--> statement-breakpoint
ALTER TABLE "employer_orgs" ALTER COLUMN "plan" SET DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "employer_orgs" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "employer_orgs" ADD COLUMN "stripe_subscription_id" text;--> statement-breakpoint
ALTER TABLE "employer_orgs" ADD COLUMN "subscription_status" "subscription_status" DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "employer_orgs" ADD COLUMN "current_period_start" timestamp;--> statement-breakpoint
ALTER TABLE "employer_orgs" ADD COLUMN "cancel_at_period_end" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "employer_orgs" ADD COLUMN "cancellation_disposition" text;--> statement-breakpoint
ALTER TABLE "employer_orgs" ADD CONSTRAINT "employer_orgs_stripe_customer_id_unique" UNIQUE("stripe_customer_id");