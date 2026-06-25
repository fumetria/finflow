CREATE TABLE "expenses_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "category_id" uuid;--> statement-breakpoint
ALTER TABLE "recurring_rules" ADD COLUMN "category_id" uuid;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_expenses_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."expenses_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_rules" ADD CONSTRAINT "recurring_rules_category_id_expenses_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."expenses_categories"("id") ON DELETE set null ON UPDATE no action;