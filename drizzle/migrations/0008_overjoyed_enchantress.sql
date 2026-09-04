ALTER TABLE "listings" ADD COLUMN "handover_pickup" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "handover_delivery" boolean DEFAULT false NOT NULL;