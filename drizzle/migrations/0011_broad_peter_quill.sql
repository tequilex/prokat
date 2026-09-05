-- Почасовой и недельный тарифы убраны: бронь посуточная, диапазон хранится
-- колонками date, и цена участвовала в расчёте только суточная. Подробности —
-- docs/BACKLOG.md.
--
-- Бэкфила у price_day намеренно нет. Пересчитать час или неделю в сутки нечем:
-- любой множитель был бы выдуманной ценой в чужом объявлении. Прода нет, а сид
-- проставляет price_day всегда, поэтому NULL взяться неоткуда. Если такая
-- строка всё же найдётся, миграция упадёт на 23502 (not_null_violation) целиком
-- и ничего не испортит — цену надо проставить руками и повторить.
ALTER TABLE "listings" ALTER COLUMN "price_day" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" DROP COLUMN IF EXISTS "price_hour";--> statement-breakpoint
ALTER TABLE "listings" DROP COLUMN IF EXISTS "price_week";