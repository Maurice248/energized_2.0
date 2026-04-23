ALTER TABLE "profiles" ADD COLUMN "summary" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "work_history" ADD COLUMN "skills" text[] DEFAULT '{}' NOT NULL;