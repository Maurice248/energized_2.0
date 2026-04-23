CREATE TYPE "public"."company_size" AS ENUM('1_10', '11_50', '51_120', '120_250', '250_500', '500_1000', '1000_plus');--> statement-breakpoint
CREATE TYPE "public"."hiring_pace" AS ENUM('passive', 'when_right', 'actively_hiring', 'scaling_fast');--> statement-breakpoint
CREATE TYPE "public"."org_member_status" AS ENUM('active', 'pending', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."org_role" AS ENUM('owner', 'admin', 'recruiter', 'hiring_manager', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."work_setup" AS ENUM('onsite', 'hybrid_preferred', 'remote_ok', 'flexible');--> statement-breakpoint
CREATE TABLE "employer_orgs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"domain" text,
	"website" text,
	"hq" text,
	"founded" text,
	"tagline" text,
	"about" text,
	"logo_url" text,
	"logo_color" text DEFAULT '#FF7A59' NOT NULL,
	"size" "company_size",
	"primary_sector" "energy_sector",
	"sub_sectors" text[] DEFAULT '{}' NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp,
	"verification_token" text,
	"plan" text DEFAULT 'starter' NOT NULL,
	"plan_renews_at" timestamp,
	"default_work_setup" "work_setup",
	"hiring_pace" "hiring_pace",
	"focus_roles" text[] DEFAULT '{}' NOT NULL,
	"auto_match" boolean DEFAULT true NOT NULL,
	"prioritize_diverse" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" text,
	"email" text NOT NULL,
	"role" "org_role" DEFAULT 'recruiter' NOT NULL,
	"status" "org_member_status" DEFAULT 'pending' NOT NULL,
	"invited_at" timestamp DEFAULT now() NOT NULL,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_org_id_employer_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."employer_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "org_members_org_id_idx" ON "org_members" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "org_members_user_id_idx" ON "org_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "org_members_org_email_unique" ON "org_members" USING btree ("org_id","email");