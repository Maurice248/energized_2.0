ALTER TABLE "interviews" ADD COLUMN "feedback" text;--> statement-breakpoint
ALTER TABLE "interviews" ADD COLUMN "feedback_by_id" text;--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_feedback_by_id_user_id_fk" FOREIGN KEY ("feedback_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;