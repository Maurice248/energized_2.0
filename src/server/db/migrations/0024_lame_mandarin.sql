CREATE TYPE "public"."skill_attempt_status" AS ENUM('in_progress', 'passed', 'passed_top', 'failed', 'forfeited');--> statement-breakpoint
CREATE TABLE "test_topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"parent_topic_id" uuid,
	"name" text NOT NULL,
	"monogram" text NOT NULL,
	"blurb" text,
	"sub_description" text,
	"tile_color" text NOT NULL,
	"job_sector_match" "energy_sector",
	"is_hot" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "test_topics_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "skill_test_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" text NOT NULL,
	"topic_id" uuid NOT NULL,
	"status" "skill_attempt_status" DEFAULT 'in_progress' NOT NULL,
	"level" text NOT NULL,
	"question_count" integer NOT NULL,
	"include_scenarios" boolean DEFAULT true NOT NULL,
	"include_calc" boolean DEFAULT true NOT NULL,
	"questions_json" jsonb NOT NULL,
	"answers_json" jsonb,
	"score" integer,
	"correct_count" integer,
	"category_breakdown" jsonb,
	"ai_feedback" text,
	"generation_model" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "skill_badges" (
	"candidate_id" text NOT NULL,
	"topic_id" uuid NOT NULL,
	"attempt_id" uuid NOT NULL,
	"is_verified_top" boolean NOT NULL,
	"score" integer NOT NULL,
	"earned_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "skill_badges_candidate_id_topic_id_pk" PRIMARY KEY("candidate_id","topic_id")
);
--> statement-breakpoint
ALTER TABLE "skill_test_attempts" ADD CONSTRAINT "skill_test_attempts_candidate_id_user_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_test_attempts" ADD CONSTRAINT "skill_test_attempts_topic_id_test_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."test_topics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_badges" ADD CONSTRAINT "skill_badges_candidate_id_user_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_badges" ADD CONSTRAINT "skill_badges_topic_id_test_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."test_topics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_badges" ADD CONSTRAINT "skill_badges_attempt_id_skill_test_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."skill_test_attempts"("id") ON DELETE no action ON UPDATE no action;