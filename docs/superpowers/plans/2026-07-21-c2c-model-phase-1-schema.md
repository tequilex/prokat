# C2C-модель — Фаза 1: схема, миграции, seed

> **Для агентных воркеров:** ОБЯЗАТЕЛЬНЫЙ САБ-СКИЛЛ: используйте superpowers:subagent-driven-development (рекомендуется) или superpowers:executing-plans для исполнения плана задача-за-задачей. Шаги отмечены чекбоксами (`- [ ]`).

**Goal:** Переписать схему БД под C2C-модель (товар принадлежит юзеру напрямую), обнулить историю миграций, обновить seed — фундамент для остальных фаз.

**Architecture:** Drizzle ORM + PostgreSQL. Удаляем сущность-прослойку `providers` и монетизацию (`subscriptions`, `promotions`, enum `provider_plan`). Товар (`listings`) и заявка (`booking_requests`) начинают ссылаться на `users` напрямую; город и категория — атрибуты товара; верификация переезжает на `users`. БД тестовая — историю миграций обнуляем и генерируем свежую стартовую.

**Tech Stack:** Drizzle ORM 0.36, drizzle-kit 0.28, PostgreSQL (pg), Vitest, tsx.

Спек: [docs/superpowers/specs/2026-07-20-c2c-model-redesign-design.md](../specs/2026-07-20-c2c-model-redesign-design.md)

---

## Область фазы

**Входит:** `drizzle/schema.ts`, история миграций, `scripts/seed.ts`, shape-тест схемы.

**НЕ входит (следующие фазы):** переписывание `src/**` (серверный слой, страницы, компоненты). После этой фазы **`src/` намеренно не проходит typecheck** — весь код ещё ссылается на удалённый `providers`. Это ожидаемо и чинится в Фазах 2–6. Критерий готовности Фазы 1 — **изолированные shape-тесты схемы зелёные + миграция применяется на чистую БД + seed наполняет её без ошибок**, а НЕ зелёный `tsc` по всему проекту.

## Структура файлов

- **Modify** `drizzle/schema.ts` — новая модель (удалить `providers`/`subscriptions`/`promotions`/`providerPlan`; `users` +верификация; `listings`/`booking_requests` на `users`).
- **Delete** `drizzle/migrations/0000_blue_stick.sql`, `0001_colorful_blazing_skull.sql`, `0002_chubby_eddie_brock.sql` и снапшоты `drizzle/migrations/meta/0000..0002_snapshot.json`; обнулить `meta/_journal.json`.
- **Generate** `drizzle/migrations/0000_*.sql` (drizzle-kit по новой схеме).
- **Modify** `scripts/seed.ts` — сиды под новую модель (юзеры-владельцы с телефоном, товары с `ownerUserId`/`cityId`).
- **Modify** `tests/db/schema.test.ts` (новый файл) — shape-тест новой схемы.

Предпосылка для задач с БД (Task 4): поднятая dev-Postgres и `DATABASE_URL` в `.env`. Локально — `docker compose up -d db` (см. `docker-compose.yml`).

---

### Task 1: Shape-тест новой схемы (failing first)

**Files:**
- Create: `tests/db/schema.test.ts`

- [ ] **Шаг 1: Написать падающий тест**

Проверяем форму новой схемы на экспортируемых drizzle-объектах (БД не нужна — быстрый юнит).

```ts
import { describe, it, expect } from "vitest";
import * as schema from "@db/schema";
import { users, listings, bookingRequests, listingStatus } from "@db/schema";

describe("C2C schema shape", () => {
  it("users has verification columns", () => {
    const cols = Object.keys(users);
    expect(cols).toEqual(expect.arrayContaining(["isVerified", "verifiedAt"]));
  });

  it("listings is owned by user and carries city/location", () => {
    const cols = Object.keys(listings);
    expect(cols).toEqual(expect.arrayContaining(["ownerUserId", "cityId", "location"]));
    expect(cols).not.toContain("providerId");
  });

  it("bookingRequests references owner user, not provider", () => {
    const cols = Object.keys(bookingRequests);
    expect(cols).toEqual(expect.arrayContaining(["ownerUserId", "ownerComment"]));
    expect(cols).not.toContain("providerId");
    expect(cols).not.toContain("providerComment");
  });

  it("listingStatus enum has no on_moderation", () => {
    expect(listingStatus.enumValues).toEqual(["active", "hidden", "archived"]);
  });

  it("dropped provider/monetization tables are gone", () => {
    expect(schema).not.toHaveProperty("providers");
    expect(schema).not.toHaveProperty("subscriptions");
    expect(schema).not.toHaveProperty("promotions");
    expect(schema).not.toHaveProperty("providerPlan");
  });
});
```

- [ ] **Шаг 2: Прогнать — убедиться, что падает**

Run: `pnpm test -- tests/db/schema.test.ts`
Expected: FAIL (текущая схема экспортирует `providers`, у `listings` есть `providerId`, у `booking_requests` — `providerId`/`providerComment`).

---

### Task 2: Переписать `drizzle/schema.ts`

**Files:**
- Modify: `drizzle/schema.ts` (полная замена содержимого)

- [ ] **Шаг 1: Заменить файл целиком**

```ts
import {
  pgTable, text, varchar, integer, bigint, timestamp, pgEnum, jsonb,
  boolean, date, doublePrecision, index, primaryKey,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["user", "moderator", "admin"]);

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: timestamp("email_verified"),
  username: varchar("username", { length: 20 }).unique(),
  name: varchar("name", { length: 100 }),
  // Телефон запрашивается в первой заявке на бронь и служит контактом продавца.
  // СМС-верификации нет: phone_verified_at заложен, всегда NULL.
  phone: varchar("phone", { length: 20 }),
  phoneVerifiedAt: timestamp("phone_verified_at"),
  image: text("image"),
  bio: text("bio"),
  role: userRole("role").notNull().default("user"),
  // «Проверенный продавец» — ставится вручную админом (см. Фаза 6).
  isVerified: boolean("is_verified").notNull().default(false),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  banReason: text("ban_reason"),
  bannedAt: timestamp("banned_at"),
}, (t) => ({
  usernameIdx: index("users_username_idx").on(t.username),
}));

// NB: TS-keys в `accounts` намеренно mixed case — этого требует @auth/drizzle-adapter.
export const accounts = pgTable("accounts", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
}, (t) => ({
  pk: primaryKey({ columns: [t.provider, t.providerAccountId] }),
}));

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires").notNull(),
});

export const verificationTokens = pgTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires").notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.identifier, t.token] }),
}));

// uploads — изображения (webp) в S3.
export const uploads = pgTable("uploads", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  key: text("key").notNull().unique(),
  publicUrl: text("public_url").notNull(),
  mime: varchar("mime", { length: 60 }).notNull(),
  size: bigint("size", { mode: "number" }).notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  userIdx: index("uploads_user_idx").on(t.userId, t.createdAt),
}));

// ============================== Каталог ==============================
// URL публичной части: /{city}/{category}[/{sub}]/ (списки),
// /{city}/{categorySlug}/{slug}-{id}/ (карточка товара), /u/{username}/ (продавец).

export const cities = pgTable("cities", {
  id: text("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 80 }).notNull().unique(),
  region: varchar("region", { length: 100 }),
  lat: doublePrecision("lat"),
  lon: doublePrecision("lon"),
  isActive: boolean("is_active").notNull().default(true),
});

// Дерево 2 уровня: parent_id NULL = корневая категория.
export const categories = pgTable("categories", {
  id: text("id").primaryKey(),
  parentId: text("parent_id"),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 80 }).notNull().unique(),
  vertical: varchar("vertical", { length: 40 }),
}, (t) => ({
  parentIdx: index("categories_parent_idx").on(t.parentId),
}));

export const depositType = pgEnum("deposit_type", ["money", "document", "none"]);
export const listingStatus = pgEnum("listing_status", ["active", "hidden", "archived"]);

// Товар принадлежит юзеру напрямую. Город и категория — атрибуты товара.
// slug читаемый и НЕ уникальный: уникальность URL даёт id в хвосте пути.
export const listings = pgTable("listings", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  cityId: text("city_id").notNull().references(() => cities.id),
  categoryId: text("category_id").notNull().references(() => categories.id),
  title: varchar("title", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 80 }).notNull(),
  description: text("description"),
  location: varchar("location", { length: 120 }),   // район/ориентир выдачи, опц.
  priceDay: integer("price_day"),
  priceHour: integer("price_hour"),
  priceWeek: integer("price_week"),
  depositAmount: integer("deposit_amount"),
  depositType: depositType("deposit_type").notNull().default("none"),
  quantity: integer("quantity").notNull().default(1),
  photosJson: jsonb("photos_json").notNull().default([]),  // { url, width, height }[]
  status: listingStatus("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  cityCategoryStatusIdx: index("listings_city_category_status_idx").on(t.cityId, t.categoryId, t.status),
  ownerIdx: index("listings_owner_idx").on(t.ownerUserId),
}));

// availability — по строке на (listing, дата). Свободно = quantity - booked - blocked.
export const availability = pgTable("availability", {
  listingId: text("listing_id").notNull().references(() => listings.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  bookedQty: integer("booked_qty").notNull().default(0),
  blockedQty: integer("blocked_qty").notNull().default(0),
}, (t) => ({
  pk: primaryKey({ columns: [t.listingId, t.date] }),
}));

export const bookingStatus = pgEnum("booking_status", [
  "new", "confirmed", "declined", "expired", "completed", "no_show", "cancelled",
]);

// Заявка на бронь. owner_user_id денормализован из listing.owner_user_id ради
// индекса «входящие заявки владельцу» без join; владелец неизменен — рассинхрона нет.
export const bookingRequests = pgTable("booking_requests", {
  id: text("id").primaryKey(),
  listingId: text("listing_id").notNull().references(() => listings.id, { onDelete: "cascade" }),
  ownerUserId: text("owner_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  customerUserId: text("customer_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  dateFrom: date("date_from").notNull(),
  dateTo: date("date_to").notNull(),
  qty: integer("qty").notNull().default(1),
  status: bookingStatus("status").notNull().default("new"),
  customerPhone: varchar("customer_phone", { length: 20 }).notNull(),
  customerComment: text("customer_comment"),
  ownerComment: text("owner_comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  respondedAt: timestamp("responded_at"),
  expiresAt: timestamp("expires_at").notNull(),
}, (t) => ({
  ownerStatusIdx: index("booking_requests_owner_status_idx").on(t.ownerUserId, t.status, t.createdAt),
  customerIdx: index("booking_requests_customer_idx").on(t.customerUserId, t.createdAt),
  listingIdx: index("booking_requests_listing_idx").on(t.listingId),
}));

// events — сырые продуктовые события (view_listing, view_phone, submit_request...).
export const events = pgTable("events", {
  id: text("id").primaryKey(),
  entityType: varchar("entity_type", { length: 40 }).notNull(),
  entityId: text("entity_id").notNull(),
  event: varchar("event", { length: 60 }).notNull(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  metaJson: jsonb("meta_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  entityIdx: index("events_entity_idx").on(t.entityType, t.entityId, t.createdAt),
}));
```

Примечание: `uniqueIndex` и `pgEnum provider_plan` больше не используются — их нет в импортах.

- [ ] **Шаг 2: Прогнать shape-тест — зелёный**

Run: `pnpm test -- tests/db/schema.test.ts`
Expected: PASS (все 5 кейсов).

- [ ] **Шаг 3: Typecheck самой схемы (изолированно)**

Run: `pnpm exec tsc --noEmit drizzle/schema.ts`
Expected: без ошибок в самом файле схемы. (Полный `tsc` проекта на этой фазе краснеет по `src/**` — это ожидаемо, не чинить здесь.)

- [ ] **Шаг 4: Коммит**

```bash
git add drizzle/schema.ts tests/db/schema.test.ts
git commit -m "feat(schema): flatten providers into users (C2C model)"
```

---

### Task 3: Обнулить историю миграций и сгенерировать свежую

**Files:**
- Delete: `drizzle/migrations/0000_blue_stick.sql`, `0001_colorful_blazing_skull.sql`, `0002_chubby_eddie_brock.sql`
- Delete: `drizzle/migrations/meta/0000_snapshot.json`, `0001_snapshot.json`, `0002_snapshot.json`
- Generate: `drizzle/migrations/0000_*.sql` + `meta/0000_snapshot.json` + обновлённый `meta/_journal.json`

- [ ] **Шаг 1: Удалить старые миграции и снапшоты**

```bash
rm drizzle/migrations/0000_blue_stick.sql \
   drizzle/migrations/0001_colorful_blazing_skull.sql \
   drizzle/migrations/0002_chubby_eddie_brock.sql \
   drizzle/migrations/meta/0000_snapshot.json \
   drizzle/migrations/meta/0001_snapshot.json \
   drizzle/migrations/meta/0002_snapshot.json
```

- [ ] **Шаг 2: Сбросить журнал миграций в пустой**

Заменить `drizzle/migrations/meta/_journal.json` на:

```json
{
  "version": "7",
  "dialect": "postgresql",
  "entries": []
}
```

- [ ] **Шаг 3: Сгенерировать свежую стартовую миграцию**

Run: `pnpm db:generate`
Expected: создан `drizzle/migrations/0000_<random>.sql` и `meta/0000_snapshot.json`; `_journal.json` содержит одну запись idx 0.

- [ ] **Шаг 4: Проверить содержимое SQL глазами**

Открыть свежий `drizzle/migrations/0000_*.sql`. Убедиться:
- НЕТ `CREATE TABLE ... providers / subscriptions / promotions`, нет типа `provider_plan`.
- `listing_status` объявлен как `('active','hidden','archived')` — без `on_moderation`.
- В `listings` есть `owner_user_id`, `city_id`, `location`; FK на `users`/`cities`.
- В `booking_requests` есть `owner_user_id`, `owner_comment`; нет `provider_id`.
- В `users` есть `is_verified`, `verified_at`.
- Индексы `listings_city_category_status_idx`, `booking_requests_owner_status_idx` присутствуют.

- [ ] **Шаг 5: Коммит**

```bash
git add drizzle/migrations
git commit -m "chore(db): reset migration history to fresh C2C baseline"
```

---

### Task 4: Применить миграцию на чистую БД и переписать seed

**Files:**
- Modify: `scripts/seed.ts`

Предпосылка: dev-Postgres поднят, `DATABASE_URL` в `.env`. Если контейнер уже крутит старую схему — пересоздать чистую БД (drop/create или `docker compose down -v db && docker compose up -d db`), т.к. свежая 0000-миграция рассчитана на пустую БД.

- [ ] **Шаг 1: Применить миграцию на чистую БД**

Run: `pnpm db:migrate`
Expected: `Migrations applied`, без ошибок.

- [ ] **Шаг 2: Переписать `scripts/seed.ts` под новую модель**

Полная замена содержимого:

```ts
// Dev/staging seeds: тестовый город, 7 категорий, 5 юзеров-владельцев и 20 товаров.
// Идемпотентен: если город уже есть — выходит. Запуск: pnpm db:seed.

import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { Pool } from "pg";
import {
  users, cities, categories, listings, availability,
} from "../drizzle/schema";
import { newId } from "../src/lib/id";
import { slugify } from "../src/lib/slugify";
import { addDaysStr, todayStr } from "../src/lib/catalog/dates";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool);

  const existing = await db.select({ id: cities.id }).from(cities).where(eq(cities.slug, "kazan")).limit(1);
  if (existing.length > 0) {
    console.log("Seeds already applied (city 'kazan' exists), nothing to do");
    await pool.end();
    return;
  }

  // --- Город ---
  const cityId = newId();
  await db.insert(cities).values({
    id: cityId,
    name: "Казань",
    slug: "kazan",
    region: "Республика Татарстан",
    lat: 55.7963,
    lon: 49.1088,
  });

  // --- Категории (дерево 2 уровня) ---
  const cat = async (name: string, vertical: string, parentId: string | null = null) => {
    const id = newId();
    await db.insert(categories).values({ id, parentId, name, slug: slugify(name), vertical });
    return id;
  };

  const toolsId = await cat("Инструмент", "tools");
  const powerToolsId = await cat("Электроинструмент", "tools", toolsId);
  const gardenId = await cat("Садовая техника", "tools", toolsId);
  const sportId = await cat("Спорт", "sport");
  const bikesId = await cat("Велосипеды", "sport", sportId);
  const supId = await cat("Сапборды", "sport", sportId);
  const dressesId = await cat("Платья", "dresses");

  // --- Юзеры-владельцы (телефон = контакт продавца) ---
  const ownerDefs = [
    { username: "prokatmaster", name: "Артём", phone: "+7 900 111-22-33" },
    { username: "instrument116", name: "Роман", phone: "+7 900 222-33-44" },
    { username: "velokazan", name: "Дмитрий", phone: "+7 900 333-44-55" },
    { username: "sup-kazanka", name: "Игорь", phone: "+7 900 444-55-66" },
    { username: "platye-naprokat", name: "Марина", phone: "+7 900 555-66-77" },
  ];

  const ownerIds: string[] = [];
  for (let i = 0; i < ownerDefs.length; i++) {
    const def = ownerDefs[i];
    const userId = newId();
    await db.insert(users).values({
      id: userId,
      email: `owner${i + 1}@seed.local`,
      username: def.username,
      name: def.name,
      phone: def.phone,
      isVerified: i < 2, // пара «проверенных» для демо значка
      verifiedAt: i < 2 ? new Date() : null,
    });
    ownerIds.push(userId);
  }

  // --- Товары: [владелец, категория, название, цена/день, залог(₽|null), тип, кол-во] ---
  const listingDefs: Array<[number, string, string, number, number | null, "money" | "document" | "none", number]> = [
    [0, powerToolsId, "Перфоратор Bosch GBH 2-26", 500, 3000, "money", 3],
    [0, powerToolsId, "Шуруповёрт Makita DF333", 300, 2000, "money", 5],
    [0, powerToolsId, "Болгарка DeWalt 125 мм", 350, 2500, "money", 2],
    [0, gardenId, "Газонокосилка бензиновая Husqvarna", 900, 5000, "money", 2],
    [0, gardenId, "Триммер электрический", 400, 2000, "money", 3],
    [1, powerToolsId, "Отбойный молоток Hilti TE 500", 1200, 8000, "money", 1],
    [1, powerToolsId, "Сварочный аппарат Ресанта 190А", 600, 4000, "money", 2],
    [1, gardenId, "Мотобур со шнеками 150/200 мм", 1000, 5000, "money", 1],
    [1, powerToolsId, "Строительный пылесос Karcher", 500, 3000, "money", 2],
    [2, bikesId, "Горный велосипед Trek Marlin 7", 700, null, "document", 6],
    [2, bikesId, "Городской велосипед Forward", 450, null, "document", 8],
    [2, bikesId, "Детский велосипед 20\"", 300, null, "document", 4],
    [2, bikesId, "Электросамокат Ninebot Max", 900, 5000, "money", 5],
    [3, supId, "Сапборд Aztron Mercury 10'10\"", 800, 3000, "money", 10],
    [3, supId, "Сапборд двухместный 15'", 1400, 5000, "money", 2],
    [3, supId, "Гидрокостюм 3 мм", 300, null, "document", 8],
    [4, dressesId, "Вечернее платье Zara, р. 42-44", 1500, 5000, "money", 1],
    [4, dressesId, "Коктейльное платье, р. 46", 1200, 4000, "money", 1],
    [4, dressesId, "Свадебное платье А-силуэт", 5000, 15000, "money", 1],
    [4, dressesId, "Платье для фотосессии со шлейфом", 2000, 6000, "money", 1],
  ];

  const listingIds: string[] = [];
  for (const [oIdx, categoryId, title, priceDay, depositAmount, depositType, quantity] of listingDefs) {
    const id = newId();
    listingIds.push(id);
    await db.insert(listings).values({
      id,
      ownerUserId: ownerIds[oIdx],
      cityId,
      categoryId,
      title,
      slug: slugify(title),
      description: `${title}. Тестовый товар из сидов.`,
      priceDay,
      priceWeek: priceDay * 5,
      depositAmount,
      depositType,
      quantity,
      status: "active",
    });
  }

  // Демо-занятость: у каждого третьего товара заняты ближайшие дни,
  // у каждого пятого — ручное закрытие.
  const today = todayStr();
  let availRows = 0;
  for (let i = 0; i < listingIds.length; i++) {
    const quantity = listingDefs[i][6];
    if (i % 3 === 0) {
      for (let d = 1; d <= 3; d++) {
        await db.insert(availability).values({
          listingId: listingIds[i],
          date: addDaysStr(today, d),
          bookedQty: Math.min(quantity, i % 2 === 0 ? quantity : 1),
        });
        availRows++;
      }
    }
    if (i % 5 === 0) {
      for (let d = 7; d <= 8; d++) {
        await db.insert(availability).values({
          listingId: listingIds[i],
          date: addDaysStr(today, d),
          blockedQty: quantity,
        });
        availRows++;
      }
    }
  }

  await pool.end();
  console.log(`Seeded: 1 city, 7 categories, ${ownerDefs.length} owners, ${listingDefs.length} listings, ${availRows} availability rows`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Шаг 3: Прогнать seed**

Run: `pnpm db:seed`
Expected: `Seeded: 1 city, 7 categories, 5 owners, 20 listings, N availability rows`, без ошибок FK.

- [ ] **Шаг 4: Проверить данные**

Run: `pnpm db:studio` (или psql). Убедиться: 5 юзеров с телефоном (2 `is_verified=true`), 20 `listings` с непустыми `owner_user_id`/`city_id`, `booking_requests` пуст, таблиц `providers`/`subscriptions`/`promotions` нет.

- [ ] **Шаг 5: Коммит**

```bash
git add scripts/seed.ts
git commit -m "feat(seed): C2C seeds — owners as users, listings own city"
```

---

### Task 5: Зафиксировать состояние фазы

- [ ] **Шаг 1: Прогнать быстрые (без-БД) тесты схемы + существующие юниты схемы**

Run: `pnpm test -- tests/db/schema.test.ts tests/auth/schema.test.ts`
Expected: PASS. (Полный `pnpm test`/`tsc` по проекту на этой фазе ещё красный из-за `src/**` — это правится в Фазах 2–6.)

- [ ] **Шаг 2: Отметить готовность**

Критерий готовности Фазы 1 выполнен: schema shape-тесты зелёные, свежая миграция применяется на чистую БД, seed наполняет её без ошибок.

---

## Что дальше

**Фаза 2 — серверный слой** (`src/server/catalog.ts`, `owner.ts`, `booking.ts`, `me.ts`, `admin.ts` + actions + `lib/owner/validation.ts`): переписать запросы с `providerId` на `ownerUserId`/`cityId`, убрать провайдер-функции, новый резолвинг сегмента. Это первый слой, возвращающий `src/` к зелёному typecheck (по мере фаз). План Фазы 2 пишется после исполнения Фазы 1 — с учётом фактического состояния.
