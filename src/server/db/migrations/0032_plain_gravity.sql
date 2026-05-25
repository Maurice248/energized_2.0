CREATE TYPE "public"."faq_category" AS ENUM('general', 'seekers', 'employers', 'billing', 'privacy');--> statement-breakpoint
CREATE TABLE "faqs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" "faq_category" DEFAULT 'general' NOT NULL,
	"question" text NOT NULL,
	"answer" text DEFAULT '' NOT NULL,
	"answer_format" "cms_body_format" DEFAULT 'markdown' NOT NULL,
	"support_article_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" "page_status" DEFAULT 'draft' NOT NULL,
	"updated_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "faqs" ADD CONSTRAINT "faqs_updated_by_user_id_user_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "faqs_category_sort_idx" ON "faqs" USING btree ("category","sort_order");--> statement-breakpoint
CREATE INDEX "faqs_status_idx" ON "faqs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "faqs_updated_at_idx" ON "faqs" USING btree ("updated_at");
