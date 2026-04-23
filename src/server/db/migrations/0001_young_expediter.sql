CREATE TYPE "public"."certification_type" AS ENUM('h2s_alive', 'first_aid', 'csts', 'red_seal', 'p_eng', 'nace', 'fall_protection', 'other');--> statement-breakpoint
CREATE TABLE "certifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"type" "certification_type" NOT NULL,
	"name" text NOT NULL,
	"issuer" text,
	"credential_id" text,
	"issued_at" timestamp,
	"expires_at" timestamp,
	"document_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"employer_name" text NOT NULL,
	"role_title" text NOT NULL,
	"site" text,
	"sector" "energy_sector",
	"commodity" text,
	"rotation" text,
	"summary" text,
	"started_at" timestamp NOT NULL,
	"ended_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "resume_url" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "resume_filename" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "resume_uploaded_at" timestamp;--> statement-breakpoint
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_history" ADD CONSTRAINT "work_history_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "certifications_profile_id_idx" ON "certifications" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "work_history_profile_id_idx" ON "work_history" USING btree ("profile_id");