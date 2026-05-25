CREATE TYPE "public"."moderation_flag_source" AS ENUM('auto', 'user', 'agent');--> statement-breakpoint
CREATE TYPE "public"."moderation_kind" AS ENUM('job', 'user', 'employer', 'message', 'application', 'duplicate', 'geo');--> statement-breakpoint
CREATE TYPE "public"."moderation_severity" AS ENUM('high', 'medium', 'low', 'spam');--> statement-breakpoint
CREATE TYPE "public"."moderation_status" AS ENUM('pending', 'approved', 'rejected', 'escalated');--> statement-breakpoint
CREATE TYPE "public"."support_ticket_priority" AS ENUM('p1', 'p2', 'p3');--> statement-breakpoint
CREATE TYPE "public"."support_ticket_status" AS ENUM('open', 'in_progress', 'closed');--> statement-breakpoint
CREATE TYPE "public"."system_service_status" AS ENUM('operational', 'degraded', 'outage');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" text,
	"actor_label" text,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moderation_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "moderation_kind" NOT NULL,
	"severity" "moderation_severity" NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"ref_table" text,
	"ref_id" text,
	"ai_confidence" integer,
	"reported_by_count" integer DEFAULT 0 NOT NULL,
	"flag_source" "moderation_flag_source" DEFAULT 'auto' NOT NULL,
	"status" "moderation_status" DEFAULT 'pending' NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"assigned_to" text,
	"resolved_at" timestamp,
	"resolved_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"subject" text NOT NULL,
	"body" text,
	"priority" "support_ticket_priority" DEFAULT 'p2' NOT NULL,
	"status" "support_ticket_status" DEFAULT 'open' NOT NULL,
	"requester_user_id" text,
	"requester_org_id" uuid,
	"assigned_to" text,
	"first_response_at" timestamp,
	"closed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "support_tickets_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "system_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"category" text DEFAULT 'infra' NOT NULL,
	"last_status" "system_service_status" DEFAULT 'operational' NOT NULL,
	"last_latency_ms" integer,
	"last_checked_at" timestamp,
	"last_incident_at" timestamp,
	"uptime_30d_pct" numeric(5, 2) DEFAULT '100.00' NOT NULL,
	"rollup" jsonb DEFAULT '{"days":[]}'::jsonb NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "system_services_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "revenue_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snapshot_date" date NOT NULL,
	"mrr_cents" bigint DEFAULT 0 NOT NULL,
	"arr_cents" bigint DEFAULT 0 NOT NULL,
	"new_subs_count" integer DEFAULT 0 NOT NULL,
	"churned_count" integer DEFAULT 0 NOT NULL,
	"enterprise_cents" bigint DEFAULT 0 NOT NULL,
	"growth_cents" bigint DEFAULT 0 NOT NULL,
	"starter_cents" bigint DEFAULT 0 NOT NULL,
	"addons_cents" bigint DEFAULT 0 NOT NULL,
	"payments_last_day_cents" bigint DEFAULT 0 NOT NULL,
	"active_org_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "revenue_snapshots_snapshot_date_unique" UNIQUE("snapshot_date")
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_items" ADD CONSTRAINT "moderation_items_assigned_to_user_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_items" ADD CONSTRAINT "moderation_items_resolved_by_user_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_requester_user_id_user_id_fk" FOREIGN KEY ("requester_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_requester_org_id_employer_orgs_id_fk" FOREIGN KEY ("requester_org_id") REFERENCES "public"."employer_orgs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assigned_to_user_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_at_idx" ON "audit_log" USING btree ("at");--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_log_action_idx" ON "audit_log" USING btree ("action","at");--> statement-breakpoint
CREATE INDEX "moderation_items_status_idx" ON "moderation_items" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "moderation_items_kind_idx" ON "moderation_items" USING btree ("kind","status");--> statement-breakpoint
CREATE INDEX "moderation_items_ref_idx" ON "moderation_items" USING btree ("ref_table","ref_id");--> statement-breakpoint
CREATE INDEX "support_tickets_status_idx" ON "support_tickets" USING btree ("status","priority");--> statement-breakpoint
CREATE INDEX "support_tickets_requester_idx" ON "support_tickets" USING btree ("requester_user_id");--> statement-breakpoint
CREATE INDEX "support_tickets_org_idx" ON "support_tickets" USING btree ("requester_org_id");--> statement-breakpoint
CREATE INDEX "revenue_snapshots_date_idx" ON "revenue_snapshots" USING btree ("snapshot_date");