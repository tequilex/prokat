# prokat — сервис-каталог прокатов

Веб-сервис, где владельцы прокатов (инструмент, спорт, платья, фототехника, детские товары) размещают позиции, а клиенты находят их через каталог и оставляют заявки на бронь. Платежи не проводятся — аренда и залог остаются между владельцем и клиентом.

Каркас унаследован от skelet (Next.js-скелет блог-платформы): инфраструктура, auth, загрузка изображений, тема.

## Стек

- **Frontend + Backend:** Next.js 15 (App Router, Server Components, Server Actions), SSR на всех публичных страницах
- **БД:** Postgres 16 (docker-compose) + Drizzle ORM
- **Auth:** Auth.js v5 — Яндекс ID (штатный провайдер) + VK ID (собственный OAuth 2.1 + PKCE)
- **Storage:** S3-совместимое хранилище (Yandex Object Storage), загрузка через sharp → webp
- **Стили:** Tailwind + CSS-токены (`theme/`), светлая/тёмная тема
- **Деплой:** docker-compose (Caddy + app + Postgres + backup), HTTPS через Let's Encrypt

## Команды

```bash
pnpm dev            # dev-сервер
pnpm build          # production-сборка
pnpm test           # vitest
pnpm lint           # eslint
pnpm db:generate    # drizzle-kit: сгенерировать миграцию из drizzle/schema.ts
pnpm db:migrate     # применить миграции (.env → DATABASE_URL)
pnpm check-theme    # проверка целостности theme-токенов
```

## Структура

- `src/app/(public)` — публичный каталог (SSR, SEO)
- `src/app/(auth)` — вход и онбординг
- `src/app/api` — auth, upload, health
- `drizzle/` — схема БД и миграции
- `theme/` — токены, типографика, тексты, SEO-дефолты
- `docs/DEPLOY.md`, `docs/RECOVERY.md` — деплой и восстановление

## Статус

Этап 1: бутстрап из skelet, блоговый слой удалён. Дальше — схема каталога
(cities/categories/providers/listings/availability/booking_requests/events),
затем публичный каталог, флоу заявок и кабинеты.
