CREATE TYPE "public"."training_level" AS ENUM('beginner', 'intermediate', 'advanced', 'all');--> statement-breakpoint
CREATE TYPE "public"."training_sector" AS ENUM('safety', 'tech', 'prof', 'soft', 'trans');--> statement-breakpoint
CREATE TYPE "public"."training_lesson_kind" AS ENUM('video', 'practice', 'quiz');--> statement-breakpoint
CREATE TYPE "public"."training_enrollment_status" AS ENUM('enrolled', 'in_progress', 'completed');--> statement-breakpoint
CREATE TABLE "trainings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"short_blurb" text NOT NULL,
	"long_blurb" text NOT NULL,
	"sector" "training_sector" NOT NULL,
	"cert_name" text,
	"hours" integer NOT NULL,
	"duration_label" text NOT NULL,
	"level" "training_level" NOT NULL,
	"monogram" text NOT NULL,
	"tile_color" text NOT NULL,
	"instructor_name" text NOT NULL,
	"instructor_role" text NOT NULL,
	"outcomes_json" jsonb NOT NULL,
	"unlocks_json" jsonb NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"is_new" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "trainings_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "training_modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"training_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"number" text NOT NULL,
	"title" text NOT NULL,
	"duration_label" text NOT NULL,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"kind" "training_lesson_kind" NOT NULL,
	"duration_label" text NOT NULL,
	"video_url" text,
	"video_provider" text,
	"practice_markdown" text,
	"quiz_questions_json" jsonb,
	"quiz_pass_threshold" integer,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_enrollments" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" text NOT NULL,
	"training_id" uuid NOT NULL,
	"status" "training_enrollment_status" DEFAULT 'enrolled' NOT NULL,
	"progress_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"enrolled_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"final_score" integer,
	CONSTRAINT "training_enrollments_candidate_id_training_id_pk" PRIMARY KEY("candidate_id","training_id")
);
--> statement-breakpoint
ALTER TABLE "training_modules" ADD CONSTRAINT "training_modules_training_id_trainings_id_fk" FOREIGN KEY ("training_id") REFERENCES "public"."trainings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_lessons" ADD CONSTRAINT "training_lessons_module_id_training_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."training_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_enrollments" ADD CONSTRAINT "training_enrollments_candidate_id_user_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_enrollments" ADD CONSTRAINT "training_enrollments_training_id_trainings_id_fk" FOREIGN KEY ("training_id") REFERENCES "public"."trainings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "training_modules_training_slug_idx" ON "training_modules" USING btree ("training_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "training_lessons_module_slug_idx" ON "training_lessons" USING btree ("module_id","slug");