CREATE TYPE "public"."access_level" AS ENUM('public', 'authenticated', 'restricted');--> statement-breakpoint
CREATE TYPE "public"."resource_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TABLE "download_audits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"user_id" uuid,
	"ip_address" varchar(64),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource_id" uuid NOT NULL,
	"original_name" varchar(255) NOT NULL,
	"storage_key" text NOT NULL,
	"mime_type" varchar(120) DEFAULT 'application/zip' NOT NULL,
	"size" bigint NOT NULL,
	"sha256" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"can_download" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp with time zone,
	"granted_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_previews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource_id" uuid NOT NULL,
	"image_url" text NOT NULL,
	"backup_url" text,
	"thumb_url" text,
	"alt_text" varchar(255),
	"position" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(180) NOT NULL,
	"slug" varchar(220) NOT NULL,
	"description" text,
	"version" varchar(40),
	"status" "resource_status" DEFAULT 'draft' NOT NULL,
	"access_level" "access_level" DEFAULT 'restricted' NOT NULL,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(320) NOT NULL,
	"name" varchar(160),
	"avatar_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "download_audits" ADD CONSTRAINT "download_audits_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "download_audits" ADD CONSTRAINT "download_audits_file_id_resource_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."resource_files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "download_audits" ADD CONSTRAINT "download_audits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_files" ADD CONSTRAINT "resource_files_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_permissions" ADD CONSTRAINT "resource_permissions_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_permissions" ADD CONSTRAINT "resource_permissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_permissions" ADD CONSTRAINT "resource_permissions_granted_by_id_users_id_fk" FOREIGN KEY ("granted_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_previews" ADD CONSTRAINT "resource_previews_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "download_audits_resource_idx" ON "download_audits" USING btree ("resource_id");--> statement-breakpoint
CREATE INDEX "download_audits_created_at_idx" ON "download_audits" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "resource_files_resource_idx" ON "resource_files" USING btree ("resource_id");--> statement-breakpoint
CREATE UNIQUE INDEX "resource_permissions_resource_user_unique" ON "resource_permissions" USING btree ("resource_id","user_id");--> statement-breakpoint
CREATE INDEX "resource_permissions_user_idx" ON "resource_permissions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "resource_previews_resource_idx" ON "resource_previews" USING btree ("resource_id");--> statement-breakpoint
CREATE UNIQUE INDEX "resources_slug_unique" ON "resources" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "resources_status_idx" ON "resources" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");