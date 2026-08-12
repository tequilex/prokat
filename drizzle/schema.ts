import {
  pgTable, text, varchar, integer, bigint, timestamp, pgEnum, jsonb,
  boolean, date, doublePrecision, index, primaryKey,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["user", "moderator", "admin"]);

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: timestamp("email_verified"),
  name: varchar("name", { length: 100 }),
  // Телефон запрашивается в первой заявке на бронь и служит контактом продавца.
  // СМС-верификации нет: phone_verified_at заложен, всегда NULL.
  phone: varchar("phone", { length: 20 }),
  phoneVerifiedAt: timestamp("phone_verified_at"),
  image: text("image"),
  bio: text("bio"),
  // argon2id. NULL у OAuth-юзеров: пароль есть только у тех, кто регистрировался почтой.
  passwordHash: text("password_hash"),
  role: userRole("role").notNull().default("user"),
  // «Проверенный продавец» — ставится вручную админом (см. Фаза 6).
  isVerified: boolean("is_verified").notNull().default(false),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  banReason: text("ban_reason"),
  bannedAt: timestamp("banned_at"),
});

// NB: TS-keys в `accounts` намеренно mixed case (camelCase для userId/providerAccountId,
// snake_case для refresh_token/access_token/etc) — этого требует @auth/drizzle-adapter,
// он обращается к property-names напрямую.
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

export const emailTokenPurpose = pgEnum("email_token_purpose", ["verify", "reset"]);

// Одноразовые ссылки из писем. В БД лежит sha256 от токена, оригинал уходит в письмо:
// дамп базы не должен давать вход в чужие аккаунты.
export const emailTokens = pgTable("email_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  purpose: emailTokenPurpose("purpose").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  // Штамп предъявления. Токены, отменённые выпуском нового письма, не штампуются,
  // а удаляются — иначе льготное окно на повторный клик оживляло бы их.
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  userPurposeIdx: index("email_tokens_user_purpose_idx").on(t.userId, t.purpose),
}));

// uploads — изображения, нормализованные через /api/upload (webp) и положенные в S3.
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
// URL-структура публичной части: /{city}/{category}[/{sub}]/ (списки),
// /{city}/{categorySlug}/{slug}-{id}/ (карточка товара), /u/{username}/ (продавец).

export const cities = pgTable("cities", {
  id: text("id").primaryKey(),                        // ULID, newId()
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 80 }).notNull().unique(),
  region: varchar("region", { length: 100 }),
  lat: doublePrecision("lat"),
  lon: doublePrecision("lon"),
  isActive: boolean("is_active").notNull().default(true),
});

// Дерево 2 уровня: parent_id NULL = корневая категория, иначе — подкатегория.
// vertical — грубая группировка ниш (tools / sport / dresses / photo / kids ...).
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
// Цены в рублях за период; NULL = не сдаётся на этот период.
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
// Строки создаются лениво: отсутствие строки = день полностью свободен.
// blocked_qty — ручные закрытия владельцем («сдал по телефону», «в ремонте»).
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

// Заявка на бронь. Денег сервис не проводит; подтверждение — за владельцем.
// owner_user_id денормализован из listing.owner_user_id ради индекса «входящие
// заявки владельцу» без join; владелец неизменен — рассинхрона нет.
// expires_at — протухание new-заявки (по умолчанию +24ч от created_at).
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
// Основа статистики для владельца; агрегатов в v1 нет.
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
