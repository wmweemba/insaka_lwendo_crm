CREATE TYPE "public"."contact_source" AS ENUM('outreach', 'referral', 'inbound', 'event', 'social');--> statement-breakpoint
CREATE TYPE "public"."engagement_stage" AS ENUM('LEAD', 'CONTACTED', 'IN_CONVERSATION', 'TRIALING', 'SIGNED_UP', 'ACTIVE', 'PAYING', 'DORMANT', 'LOST');--> statement-breakpoint
CREATE TYPE "public"."ingest_status" AS ENUM('processed', 'duplicate', 'error');--> statement-breakpoint
CREATE TYPE "public"."interaction_channel" AS ENUM('whatsapp', 'telegram', 'call', 'in_person', 'email', 'social', 'system');--> statement-breakpoint
CREATE TYPE "public"."interaction_direction" AS ENUM('outbound', 'inbound', 'note');--> statement-breakpoint
CREATE TYPE "public"."next_action_status" AS ENUM('open', 'done', 'cancelled');--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"company" text,
	"phone" text,
	"phone_alt" text[],
	"email" text,
	"source" "contact_source",
	"referred_by" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "engagements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"product_id" integer NOT NULL,
	"stage" "engagement_stage" DEFAULT 'LEAD' NOT NULL,
	"tier" smallint,
	"app_user_id" text,
	"interest_note" text,
	"stage_changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingest_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text NOT NULL,
	"endpoint" text NOT NULL,
	"payload" jsonb,
	"status" "ingest_status" NOT NULL,
	"error" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"engagement_id" uuid NOT NULL,
	"happened_at" timestamp with time zone NOT NULL,
	"channel" "interaction_channel" NOT NULL,
	"direction" "interaction_direction" NOT NULL,
	"summary" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "next_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"engagement_id" uuid NOT NULL,
	"description" text NOT NULL,
	"due_date" date,
	"status" "next_action_status" DEFAULT 'open' NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "usage_rollups" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"app_user_id" text NOT NULL,
	"period_date" date NOT NULL,
	"last_active_at" timestamp with time zone,
	"counts" jsonb,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "engagements" ADD CONSTRAINT "engagements_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagements" ADD CONSTRAINT "engagements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_engagement_id_engagements_id_fk" FOREIGN KEY ("engagement_id") REFERENCES "public"."engagements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "next_actions" ADD CONSTRAINT "next_actions_engagement_id_engagements_id_fk" FOREIGN KEY ("engagement_id") REFERENCES "public"."engagements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_rollups" ADD CONSTRAINT "usage_rollups_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "engagements_contact_id_product_id_key" ON "engagements" USING btree ("contact_id","product_id");--> statement-breakpoint
CREATE INDEX "engagements_product_id_stage_idx" ON "engagements" USING btree ("product_id","stage");--> statement-breakpoint
CREATE INDEX "ingest_log_source_received_at_idx" ON "ingest_log" USING btree ("source","received_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "interactions_engagement_id_happened_at_idx" ON "interactions" USING btree ("engagement_id","happened_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "next_actions_status_due_date_idx" ON "next_actions" USING btree ("status","due_date");--> statement-breakpoint
CREATE UNIQUE INDEX "usage_rollups_product_id_app_user_id_period_date_key" ON "usage_rollups" USING btree ("product_id","app_user_id","period_date");--> statement-breakpoint
CREATE INDEX "usage_rollups_product_id_app_user_id_period_date_idx" ON "usage_rollups" USING btree ("product_id","app_user_id","period_date" DESC NULLS LAST);