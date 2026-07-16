CREATE TYPE "public"."booking_status" AS ENUM('new', 'confirmed', 'declined', 'expired', 'completed', 'no_show', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."deposit_type" AS ENUM('money', 'document', 'none');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('active', 'hidden', 'archived', 'on_moderation');--> statement-breakpoint
CREATE TYPE "public"."provider_plan" AS ENUM('free', 'pro', 'promo');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "availability" (
	"listing_id" text NOT NULL,
	"date" date NOT NULL,
	"booked_qty" integer DEFAULT 0 NOT NULL,
	"blocked_qty" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "availability_listing_id_date_pk" PRIMARY KEY("listing_id","date")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "booking_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"listing_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"customer_user_id" text NOT NULL,
	"date_from" date NOT NULL,
	"date_to" date NOT NULL,
	"qty" integer DEFAULT 1 NOT NULL,
	"status" "booking_status" DEFAULT 'new' NOT NULL,
	"customer_phone" varchar(20) NOT NULL,
	"customer_comment" text,
	"provider_comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"responded_at" timestamp,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"parent_id" text,
	"name" varchar(100) NOT NULL,
	"slug" varchar(80) NOT NULL,
	"vertical" varchar(40),
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cities" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(80) NOT NULL,
	"region" varchar(100),
	"lat" double precision,
	"lon" double precision,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "cities_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "events" (
	"id" text PRIMARY KEY NOT NULL,
	"entity_type" varchar(40) NOT NULL,
	"entity_id" text NOT NULL,
	"event" varchar(60) NOT NULL,
	"user_id" text,
	"meta_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "listings" (
	"id" text PRIMARY KEY NOT NULL,
	"provider_id" text NOT NULL,
	"category_id" text NOT NULL,
	"title" varchar(200) NOT NULL,
	"slug" varchar(80) NOT NULL,
	"description" text,
	"price_day" integer,
	"price_hour" integer,
	"price_week" integer,
	"deposit_amount" integer,
	"deposit_type" "deposit_type" DEFAULT 'none' NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"photos_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "listing_status" DEFAULT 'on_moderation' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "promotions" (
	"id" text PRIMARY KEY NOT NULL,
	"provider_id" text NOT NULL,
	"listing_id" text,
	"type" varchar(40) NOT NULL,
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "providers" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"city_id" text NOT NULL,
	"name" varchar(150) NOT NULL,
	"slug" varchar(80) NOT NULL,
	"description" text,
	"address" text,
	"lat" double precision,
	"lon" double precision,
	"phones" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"work_hours_json" jsonb,
	"is_claimed" boolean DEFAULT true NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"plan" "provider_plan" DEFAULT 'free' NOT NULL,
	"plan_expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"provider_id" text NOT NULL,
	"plan" "provider_plan" NOT NULL,
	"price" integer NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"status" varchar(20) NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "availability" ADD CONSTRAINT "availability_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "booking_requests" ADD CONSTRAINT "booking_requests_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "booking_requests" ADD CONSTRAINT "booking_requests_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "booking_requests" ADD CONSTRAINT "booking_requests_customer_user_id_users_id_fk" FOREIGN KEY ("customer_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "events" ADD CONSTRAINT "events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "listings" ADD CONSTRAINT "listings_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "listings" ADD CONSTRAINT "listings_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "promotions" ADD CONSTRAINT "promotions_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "promotions" ADD CONSTRAINT "promotions_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "providers" ADD CONSTRAINT "providers_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "providers" ADD CONSTRAINT "providers_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "booking_requests_provider_status_idx" ON "booking_requests" USING btree ("provider_id","status","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "booking_requests_customer_idx" ON "booking_requests" USING btree ("customer_user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "booking_requests_listing_idx" ON "booking_requests" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "categories_parent_idx" ON "categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_entity_idx" ON "events" USING btree ("entity_type","entity_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "listings_provider_slug_uq" ON "listings" USING btree ("provider_id","slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "listings_category_status_idx" ON "listings" USING btree ("category_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "listings_provider_idx" ON "listings" USING btree ("provider_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "providers_city_slug_uq" ON "providers" USING btree ("city_id","slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "providers_owner_idx" ON "providers" USING btree ("owner_user_id");