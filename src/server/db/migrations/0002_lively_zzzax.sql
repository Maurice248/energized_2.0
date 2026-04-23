CREATE TYPE "public"."availability" AS ENUM('immediately', 'notice_2w', 'notice_4w', 'notice_3m', 'browsing');--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "skills" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "open_to_work" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "fifo_rotational" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "min_comp_cad" integer;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "availability" "availability";