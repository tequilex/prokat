CREATE TABLE IF NOT EXISTS "chat_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"thread_id" text NOT NULL,
	"sender_user_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chat_threads" (
	"id" text PRIMARY KEY NOT NULL,
	"listing_id" text NOT NULL,
	"customer_user_id" text NOT NULL,
	"owner_user_id" text NOT NULL,
	"last_message_at" timestamp DEFAULT now() NOT NULL,
	"owner_last_read_message_id" text,
	"customer_last_read_message_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_thread_id_chat_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."chat_threads"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_user_id_users_id_fk" FOREIGN KEY ("sender_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chat_threads" ADD CONSTRAINT "chat_threads_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chat_threads" ADD CONSTRAINT "chat_threads_customer_user_id_users_id_fk" FOREIGN KEY ("customer_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chat_threads" ADD CONSTRAINT "chat_threads_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_messages_thread_idx" ON "chat_messages" USING btree ("thread_id","id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_messages_sender_idx" ON "chat_messages" USING btree ("sender_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "chat_threads_listing_customer_uq" ON "chat_threads" USING btree ("listing_id","customer_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_threads_owner_idx" ON "chat_threads" USING btree ("owner_user_id","last_message_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_threads_customer_idx" ON "chat_threads" USING btree ("customer_user_id","last_message_at");