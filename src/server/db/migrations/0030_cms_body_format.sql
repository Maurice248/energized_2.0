CREATE TYPE "public"."cms_body_format" AS ENUM('markdown', 'html');--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "body_format" "cms_body_format" DEFAULT 'markdown' NOT NULL;
