CREATE TYPE "public"."interview_medium" AS ENUM('video', 'phone', 'in_person');--> statement-breakpoint
CREATE TYPE "public"."interview_status" AS ENUM('proposed', 'confirmed', 'canceled', 'expired', 'completed');--> statement-breakpoint
ALTER TYPE "public"."notification_kind" ADD VALUE 'interview_proposed';--> statement-breakpoint
ALTER TYPE "public"."notification_kind" ADD VALUE 'interview_confirmed';--> statement-breakpoint
ALTER TYPE "public"."notification_kind" ADD VALUE 'interview_canceled';--> statement-breakpoint
ALTER TYPE "public"."notification_kind" ADD VALUE 'interview_reminder';--> statement-breakpoint
ALTER TYPE "public"."notification_kind" ADD VALUE 'interview_time_requested';--> statement-breakpoint
CREATE TABLE "interview_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"interview_id" uuid NOT NULL,
	"starts_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"proposed_by_id" text,
	"medium" "interview_medium" NOT NULL,
	"details" text NOT NULL,
	"duration_min" integer DEFAULT 60 NOT NULL,
	"notes" text,
	"status" "interview_status" DEFAULT 'proposed' NOT NULL,
	"cancel_reason" text,
	"canceled_by_id" text,
	"confirmed_slot_id" uuid,
	"expires_at" timestamp NOT NULL,
	"reminded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "interview_slots" ADD CONSTRAINT "interview_slots_interview_id_interviews_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."interviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_proposed_by_id_user_id_fk" FOREIGN KEY ("proposed_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_canceled_by_id_user_id_fk" FOREIGN KEY ("canceled_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "interview_slots_interview_idx" ON "interview_slots" USING btree ("interview_id");--> statement-breakpoint
CREATE INDEX "interview_slots_starts_at_idx" ON "interview_slots" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "interviews_application_status_idx" ON "interviews" USING btree ("application_id","status");--> statement-breakpoint
CREATE INDEX "interviews_status_expires_idx" ON "interviews" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "interviews_status_reminded_idx" ON "interviews" USING btree ("status","reminded_at");