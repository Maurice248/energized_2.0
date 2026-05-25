CREATE TYPE "public"."certification_verification_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
ALTER TABLE "certifications" ADD COLUMN "verification_status" "certification_verification_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "certifications" ADD COLUMN "verified_by" text;--> statement-breakpoint
ALTER TABLE "certifications" ADD COLUMN "verified_at" timestamp;--> statement-breakpoint
ALTER TABLE "certifications" ADD COLUMN "verification_note" text;--> statement-breakpoint
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_verified_by_user_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "certifications_verification_status_idx" ON "certifications" USING btree ("verification_status");