ALTER TABLE "employer_orgs" ADD COLUMN "domain_verify_email_token" text;--> statement-breakpoint
ALTER TABLE "employer_orgs" ADD COLUMN "domain_verify_email_to" text;--> statement-breakpoint
ALTER TABLE "employer_orgs" ADD COLUMN "domain_verify_email_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "employer_orgs" ADD COLUMN "domain_verify_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "org_members" ADD COLUMN "invite_token" text;--> statement-breakpoint
ALTER TABLE "org_members" ADD COLUMN "invite_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "org_members" ADD COLUMN "invited_by_user_id" text;--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_invited_by_user_id_user_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employer_orgs" ADD CONSTRAINT "employer_orgs_domain_verify_email_token_unique" UNIQUE("domain_verify_email_token");--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_invite_token_unique" UNIQUE("invite_token");