ALTER TABLE "users" DROP CONSTRAINT "users_username_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "users_username_idx";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "username";