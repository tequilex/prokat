ALTER TABLE "cities" ADD COLUMN "name_locative" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "city_id" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
-- Backfill: правилом падеж не вывести (составные названия склоняются иначе),
-- а сид на проде не гоняют. Городов в системе на момент миграции ровно один,
-- поэтому проставляем его явно; остальные заполняются в админке, а до тех пор
-- заголовок собирается без предлога и неверный падеж не показывает.
UPDATE "cities" SET "name_locative" = 'Казани'
WHERE "slug" = 'kazan' AND "name_locative" IS NULL;
