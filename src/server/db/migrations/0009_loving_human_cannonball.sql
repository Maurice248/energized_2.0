CREATE TYPE "public"."experience_level" AS ENUM('entry', 'intermediate', 'senior', 'lead', 'executive');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('draft', 'published', 'closed');--> statement-breakpoint
CREATE TABLE "job_listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"created_by_user_id" text NOT NULL,
	"title" text,
	"sector" "energy_sector",
	"sub_sectors" text[] DEFAULT '{}' NOT NULL,
	"experience_level" "experience_level",
	"location" text,
	"work_setup" "work_setup",
	"rotation_schedule" text,
	"hours_per_week" integer,
	"salary_min" integer,
	"salary_max" integer,
	"salary_currency" text DEFAULT 'CAD' NOT NULL,
	"salary_period" text DEFAULT 'year' NOT NULL,
	"required_certifications" text[] DEFAULT '{}' NOT NULL,
	"screening_questions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"summary" text,
	"description" text,
	"status" "job_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp,
	"closed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_listings" ADD CONSTRAINT "job_listings_org_id_employer_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."employer_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_listings" ADD CONSTRAINT "job_listings_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;