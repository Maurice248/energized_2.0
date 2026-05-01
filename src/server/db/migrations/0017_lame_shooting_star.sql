CREATE TABLE "saved_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"candidate_user_id" text NOT NULL,
	"saved_by_user_id" text,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "saved_candidates_org_candidate_unique" UNIQUE("org_id","candidate_user_id")
);
--> statement-breakpoint
ALTER TABLE "saved_candidates" ADD CONSTRAINT "saved_candidates_org_id_employer_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."employer_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_candidates" ADD CONSTRAINT "saved_candidates_candidate_user_id_user_id_fk" FOREIGN KEY ("candidate_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_candidates" ADD CONSTRAINT "saved_candidates_saved_by_user_id_user_id_fk" FOREIGN KEY ("saved_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "saved_candidates_org_idx" ON "saved_candidates" USING btree ("org_id");