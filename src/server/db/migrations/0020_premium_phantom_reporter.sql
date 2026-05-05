CREATE TYPE "public"."intro_request_status" AS ENUM('pending', 'accepted', 'declined', 'canceled', 'expired');--> statement-breakpoint
ALTER TYPE "public"."notification_kind" ADD VALUE 'intro_requested';--> statement-breakpoint
ALTER TYPE "public"."notification_kind" ADD VALUE 'intro_accepted';--> statement-breakpoint
ALTER TYPE "public"."notification_kind" ADD VALUE 'intro_declined';--> statement-breakpoint
CREATE TABLE "intro_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"candidate_user_id" text NOT NULL,
	"requested_by_user_id" text,
	"message" text,
	"status" "intro_request_status" DEFAULT 'pending' NOT NULL,
	"accepted_at" timestamp,
	"declined_at" timestamp,
	"canceled_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "intro_requests" ADD CONSTRAINT "intro_requests_org_id_employer_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."employer_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intro_requests" ADD CONSTRAINT "intro_requests_candidate_user_id_user_id_fk" FOREIGN KEY ("candidate_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intro_requests" ADD CONSTRAINT "intro_requests_requested_by_user_id_user_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "intro_requests_org_candidate_status_idx" ON "intro_requests" USING btree ("org_id","candidate_user_id","status");--> statement-breakpoint
CREATE INDEX "intro_requests_candidate_status_created_idx" ON "intro_requests" USING btree ("candidate_user_id","status","created_at");--> statement-breakpoint
CREATE INDEX "intro_requests_org_status_created_idx" ON "intro_requests" USING btree ("org_id","status","created_at");--> statement-breakpoint
CREATE INDEX "intro_requests_status_expires_idx" ON "intro_requests" USING btree ("status","expires_at");