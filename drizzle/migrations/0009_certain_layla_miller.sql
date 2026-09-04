ALTER TABLE "listings" ADD COLUMN "hidden_by_ban" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- Backfill: до этой миграции бан не трогал объявления, поэтому у уже забаненных
-- владельцев вещи остались active и висят в каталоге, поиске и sitemap. Колонка
-- со значением по умолчанию чинит только будущие баны — старые гасим здесь.
UPDATE "listings" SET "status" = 'hidden', "hidden_by_ban" = true, "updated_at" = now()
WHERE "status" = 'active'
  AND "owner_user_id" IN (SELECT "id" FROM "users" WHERE "banned_at" IS NOT NULL);