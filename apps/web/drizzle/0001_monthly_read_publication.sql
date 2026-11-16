CREATE TABLE "monthly_read_revision" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"draft_id" uuid NOT NULL,
	"period" date NOT NULL,
	"source_version" integer NOT NULL,
	"title_tr" text NOT NULL,
	"title_en" text NOT NULL,
	"author" text NOT NULL,
	"band_tr" text NOT NULL,
	"band_en" text NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "monthly_read_revision_draft_source_unique" UNIQUE("draft_id", "source_version"),
	CONSTRAINT "monthly_read_revision_period_id_unique" UNIQUE("period", "id"),
	CONSTRAINT "monthly_read_revision_period_first_day" CHECK (extract(day from "period") = 1),
	CONSTRAINT "monthly_read_revision_positive_source_version" CHECK ("source_version" > 0)
);
--> statement-breakpoint
CREATE TABLE "monthly_read_publication" (
	"period" date PRIMARY KEY NOT NULL,
	"revision_id" uuid NOT NULL,
	CONSTRAINT "monthly_read_publication_period_first_day" CHECK (extract(day from "period") = 1),
	CONSTRAINT "monthly_read_publication_revision_period_fk" FOREIGN KEY ("period", "revision_id") REFERENCES "public"."monthly_read_revision"("period", "id") ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
ALTER TABLE "monthly_read_revision" ADD CONSTRAINT "monthly_read_revision_draft_id_monthly_read_draft_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."monthly_read_draft"("id") ON DELETE restrict ON UPDATE no action;
