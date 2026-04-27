CREATE TABLE "profile_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_user_id" text,
	"subject_org_id" uuid,
	"viewer_user_id" text,
	"viewed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profile_views" ADD CONSTRAINT "profile_views_subject_user_id_user_id_fk" FOREIGN KEY ("subject_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_views" ADD CONSTRAINT "profile_views_subject_org_id_employer_orgs_id_fk" FOREIGN KEY ("subject_org_id") REFERENCES "public"."employer_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_views" ADD CONSTRAINT "profile_views_viewer_user_id_user_id_fk" FOREIGN KEY ("viewer_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "profile_views_subject_user_idx" ON "profile_views" USING btree ("subject_user_id","viewed_at");--> statement-breakpoint
CREATE INDEX "profile_views_subject_org_idx" ON "profile_views" USING btree ("subject_org_id","viewed_at");