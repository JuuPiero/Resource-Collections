ALTER TABLE "resources" ADD COLUMN "category" varchar(40) DEFAULT 'other' NOT NULL;--> statement-breakpoint
CREATE INDEX "resources_category_idx" ON "resources" USING btree ("category");