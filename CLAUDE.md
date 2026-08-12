# prokat — C2C-маркетплейс аренды вещей

Веб-сервис «арендуй что угодно рядом» в духе Авито, но для аренды. Любой пользователь
одновременно и **арендатор** («я арендую»), и **продавец** («я сдаю»): размещает свои
вещи и бронирует чужие. Платежей внутри нет — оплата и залог остаются между людьми;
сервис сводит их и ведёт заявки на бронь.

Это самостоятельный проект. Общение и UI — на русском; идентификаторы кода и
commit-сообщения — на английском.

## Стек

- **Fullstack:** Next.js 15 (App Router, Server Components, Server Actions), React 19, TypeScript. SSR на всех публичных страницах.
- **БД:** PostgreSQL 16 (docker-compose) + Drizzle ORM. Схема — единственный источник в `drizzle/schema.ts`.
- **Auth:** Auth.js v5 (`@auth/drizzle-adapter`) — Яндекс ID (штатный провайдер), VK ID (собственный OAuth 2.1 + PKCE, см. `src/lib/auth/oauth-vk.ts`) и почта с паролем (argon2id + подтверждение по письму, см. `src/lib/auth/flows.ts`). Сессии — database, выдаются общим `src/lib/auth/session.ts`.
- **Storage:** S3-совместимое (Yandex Object Storage); загрузка изображений через `sharp` → webp (`/api/upload`).
- **Стили:** Tailwind + CSS-токены в `theme/`, светлая/тёмная темы (`next-themes`).
- **ID:** ULID (`newId()` в `src/lib/id.ts`). **Цены:** целые рубли. **Слаги:** `slugify()`.
- **Тесты:** Vitest (342 теста, только в `tests/**`, импорт через `@/`).
- **Деплой:** docker-compose (Caddy + app + Postgres + backup), HTTPS via Let's Encrypt. См. `docs/DEPLOY.md`, `docs/RECOVERY.md`.

## Команды

```bash
pnpm dev            # dev-сервер (http://localhost:3000)
pnpm build          # production-сборка (перед сборкой остановить dev — общий .next)
pnpm test           # vitest
pnpm lint           # eslint
pnpm exec tsc --noEmit   # проверка типов всего проекта
pnpm db:generate    # drizzle-kit: сгенерировать миграцию из drizzle/schema.ts
pnpm db:migrate     # применить миграции (.env → DATABASE_URL)
pnpm db:seed        # заполнить тестовыми данными (идемпотентно)
pnpm db:studio      # drizzle studio
```

## Модель данных (`drizzle/schema.ts`)

Плоская модель: **`users → listings → booking_requests`**. Отдельной сущности «прокат/
бизнес» нет — товар принадлежит юзеру напрямую.

| Таблица | Назначение | Ключевые поля / связи |
|---|---|---|
| **users** | пользователь (он же продавец и покупатель) | `id`, `email`, `name` (подпись у аватара и в заявке; nullable), `phone` (контакт продавца), `image`, `bio`, `role` (`user`/`moderator`/`admin`), `isVerified`+`verifiedAt` (ставит админ), `createdAt`, `bannedAt`/`banReason` |
| **accounts / sessions / verification_tokens** | Auth.js | `accounts.provider` здесь = OAuth-провайдер (vk/yandex), **не** доменная сущность |
| **uploads** | загруженные изображения в S3 | `userId`, `key`, `publicUrl`, размеры |
| **cities** | справочник городов | `slug` (uniq), `isActive` |
| **categories** | дерево 2 уровня | `parentId` (NULL = корневая), `slug` (uniq глобально), `vertical` |
| **listings** | объявление/товар | **`ownerUserId`→users**, **`cityId`→cities**, `categoryId`→categories, `title`, `slug` (НЕ uniq), `location` (район, опц.), `priceDay/Hour/Week`, `depositType`+`depositAmount`, `quantity`, `photosJson`, `status` (`active`/`hidden`/`archived`) |
| **availability** | занятость по дням | PK (`listingId`,`date`); `bookedQty`, `blockedQty`. Нет строки = день свободен |
| **booking_requests** | заявка на бронь | `listingId`, **`ownerUserId`** (денорм. владелец, для индекса «мои входящие»), `customerUserId`, `dateFrom/To`, `qty`, `status` (`new`/`confirmed`/`declined`/`expired`/`completed`/`no_show`/`cancelled`), `customerPhone`, `customerComment`, `ownerComment`, `expiresAt` |
| **events** | продуктовая аналитика | `entityType`, `entityId`, `event` (view_listing, view_phone, submit_request…), `userId`, `metaJson` |

Связи: user 1—N listings (владелец); listing 1—N booking_requests; user (customer) 1—N
booking_requests; listing 1—N availability; city/category 1—N listings.

## URL-структура

| URL | Что |
|---|---|
| `/` | главная (герой + поиск + категории) |
| `/{city}` | витрина города (категории + счётчики) |
| `/{city}/{category}` и `/{city}/{category}/{sub}` | списки товаров (фильтры, пагинация) |
| `/{city}/{categorySlug}/{slug}-{id}` | **карточка товара** — `id` это ULID в хвосте; резолв по нему, при неканоничном адресе 301 |
| `/u/{id}` | публичный профиль продавца (товары, «на сайте с», значок «Проверен»); адрес по ULID — имя в URL не выносим |
| `/search?q=` | поиск по названию/описанию в пределах города |
| `/login`, `/reset`, `/banned` | вход, смена пароля по ссылке из письма, блокировка |
| `/requests` | «Мои заявки» (как арендатор) |
| `/cabinet/listings`, `/cabinet/listings/new`, `/cabinet/listings/[id]` | мои объявления, размещение, редактирование |
| `/cabinet/requests`, `/cabinet/calendar` | входящие заявки (как владелец), календарь занятости |
| `/profile` | профиль + настройки (имя, телефон, bio) — единый экран |
| `/admin/{users,listings,cities,categories,requests}` | админка (role=admin); в `/admin/users` — verify + бан |
| `/api/{auth,oauth/vk,upload,health}` | системные; `/api/auth/email/verify` — подтверждение почты; `/api/dev/login[?role=admin]` — быстрый dev-вход (404 в prod) |

Резолвер сегментов — `src/app/(public)/[city]/[seg]/[sub]/page.tsx` + хелпер
`src/lib/catalog/listing-path.ts` (`extractListingId`, `listingPath`).

## Карта кода

- **`drizzle/`** — `schema.ts` (источник схемы) + `migrations/`. Менять схему → `db:generate`.
- **`scripts/`** — `seed.ts`, `migrate.ts`.
- **`src/server/*.ts`** — read-слой (запросы): `catalog.ts` (публичный каталог, продавцы), `owner.ts` (кабинет владельца), `booking.ts` (заявки покупателя), `me.ts` (профиль), `admin.ts`.
- **`src/server/actions/*.ts`** — мутации (Server Actions): `owner.ts` (создать/править товар, решения по заявкам, календарь), `booking.ts` (создать/отменить заявку), `admin.ts` (модерация, города/категории, бан, verify), `profile.ts`.
- **`src/lib/`** — `auth/` (config, guard `requireAuthState`, VK OAuth, `flows`/`store`/`session`/`password`/`email-tokens`/`email` — вход по почте), `mail/` (SMTP или консоль + шаблоны писем), `http/`, `catalog/` (`availability`, `dates`, `filters`, `format`, `listing-path`, `booking-status`), `booking/` (валидация, параметры), `owner/` (валидация форм, `categories`), `images/`, `storage/`, `db.ts`, `id.ts`, `rate-limit.ts`, `jsonld.ts`.
- **`src/components/`** — по зонам: `catalog/`, `booking/`, `cabinet/`, `admin/`, `me/`, `account/` (навигация кабинета), `home/`, `layout/`, `auth/`, `seo/`, `ui/`, `providers/` (**= `ThemeProvider`**, не доменная сущность).
- **`src/app/`** — роуты: `(public)/`, `(app)/` (`cabinet`, `(me)`, `admin`), `(auth)/`, `api/`.
- **`theme/`** — `tokens.css` (цвета/радиусы), `content.ts` (тексты), `seo.ts`.
- **`tests/`** — Vitest, зеркалит структуру `src`.
- **`docs/superpowers/`** — спек (`specs/`) и пофазные планы (`plans/`) редизайна модели: история и обоснование архитектурных решений.

## Ключевые флоу

- **Auth:** VK ID (свой OAuth 2.1+PKCE), Яндекс ID или почта с паролем. Никакого онбординга после входа нет: ника в системе не существует, человека представляет `name` — у OAuth приходит от провайдера, при регистрации почтой спрашивается в той же форме. Гард `requireAuthState` проверяет только «залогинен и не забанен».
- **Размещение:** любой залогиненный юзер → `/cabinet/listings/new` → `createListing` (город, категория, цены, фото, опц. район). Публикуется сразу `active` (премодерации нет).
- **Бронь:** карточка товара → `BookingWidget` → `createBookingRequest` (заявка `new`, даты НЕ занимаются). Владелец в `/cabinet/requests` подтверждает → `confirmed` транзакционно увеличивает `bookedQty` с перепроверкой занятости под блокировкой. Телефоны раскрываются сторонам после подтверждения.
- **Регистрация по почте:** форма на `/login` → письмо со ссылкой (24 ч) → подтверждение проставляет `emailVerified`, выдаёт сессию и возвращает на страницу, с которой человек уходил регистрироваться (адрес едет параметром `next` в ссылке, проверяется `safeCallback`). До подтверждения вход запрещён. Сброс пароля (ссылка 1 ч) удаляет все сессии юзера. Автосклейки с OAuth нет: коллизия почты — понятный отказ (дискриминатор — строки в `accounts`, **не** `emailVerified`: у OAuth-юзеров он всегда NULL). Стоп-лист иностранных доменов (`src/lib/auth/email.ts` + `BLOCKED_EMAIL_DOMAINS`) действует **только** на регистрации.
- **Верификация:** админ в `/admin/users` жмёт «Проверить» → `users.isVerified`. Значок «Проверен» на профиле и в блоке продавца.

## Инварианты домена (см. `src/lib/catalog/booking-status.ts`, `availability.ts`)

- Диапазон брони `[dateFrom, dateTo]` включает **обе** границы.
- Свободно на день = `quantity − bookedQty − blockedQty`; отсутствие строки availability = день полностью свободен.
- Только `confirmed` держит `bookedQty`. `completed`/`no_show` даты **не** освобождают; отмена `confirmed` — освобождает (в той же транзакции).
- `blockedQty` — ручные закрытия владельцем («сдал по телефону», «в ремонте»).
- Заявки `new` протухают лениво по `expiresAt` (+24ч): `expireStaleRequests()` вызывается перед чтением списков (крона нет).

## Конвенции

- **Темы и адаптив обязательны на каждом экране.** Цвета — только через токены `theme/tokens.css` (`:root` + `.dark`), не хардкодить. Акцент — зелёный. Мобайл проектируется первым классом (не «сжатый десктоп»), без горизонтального скролла body.
- **Тесты** — только в `tests/**`, импорт через `@/` (vitest `include=tests/**`).
- **Коммиты** — чистые и осмысленные, без нарратива задач/планов в теле; идентификаторы и сообщения на английском.

## Dev-заметки

- Поднять окружение: `docker compose up -d db` → `pnpm db:migrate && pnpm db:seed` → `pnpm dev`.
- Сброс dev-БД начисто: `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` + `DROP SCHEMA IF EXISTS drizzle CASCADE;` (журнал миграций живёт в схеме `drizzle`).
- `.next/types` держит устаревшие типы удалённых роутов после dev-сервера → ложные `TS2307`; лечит `rm -rf .next/types`.
- Перед `pnpm build` останавливать dev-сервер (общий каталог `.next`).
- Seed создаёт: 1 город (Казань), 7 категорий, 5 юзеров-владельцев (2 «проверенных», с именем и телефоном), 20 товаров.
- Вне production seed раздаёт владельцам (`ownerN@seed.local`) пароль `prokat-dev-12345` и проставляет `emailVerified` — чтобы вход по паролю можно было проверить без возни с письмами. В production ветка не выполняется (`devSeedPassword`). Без `SMTP_*` письма печатаются в консоль dev-сервера — ссылку подтверждения брать оттуда.
