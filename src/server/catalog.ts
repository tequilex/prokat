// Data layer публичного каталога. Только чтение, только активные сущности.
// Все функции принимают уже разрезолвленные id (страницы резолвят слаги сами).

import {
  and, asc, desc, eq, gte, ilike, inArray, lte, or, sql,
} from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  availability, categories, cities, listings, users,
} from "@db/schema";

export type City = typeof cities.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Listing = typeof listings.$inferSelect;

export interface ListingPhoto { url: string; width: number; height: number }

export function listingPhotos(listing: Listing): ListingPhoto[] {
  return Array.isArray(listing.photosJson) ? (listing.photosJson as ListingPhoto[]) : [];
}

export async function getActiveCities(): Promise<City[]> {
  return getDb().select().from(cities)
    .where(eq(cities.isActive, true))
    .orderBy(asc(cities.name));
}

export async function getCityBySlug(slug: string): Promise<City | null> {
  const rows = await getDb().select().from(cities)
    .where(and(eq(cities.slug, slug), eq(cities.isActive, true)))
    .limit(1);
  return rows[0] ?? null;
}

// Всё дерево категорий (строк мало — десятки). Сортировка по имени.
export async function getAllCategories(): Promise<Category[]> {
  return getDb().select().from(categories).orderBy(asc(categories.name));
}

// Активные позиции города, сгруппированные по category_id (прямому, без роллапа).
export async function getListingCountsByCategory(cityId: string): Promise<Map<string, number>> {
  const rows = await getDb()
    .select({ categoryId: listings.categoryId, cnt: sql<number>`count(*)::int` })
    .from(listings)
    .where(and(eq(listings.cityId, cityId), eq(listings.status, "active")))
    .groupBy(listings.categoryId);
  return new Map(rows.map((r) => [r.categoryId, r.cnt]));
}

// Роллап прямых счётчиков на корневые категории по дереву.
export function rollupToRoots(cats: Category[], direct: Map<string, number>): Map<string, number> {
  const parentOf = new Map(cats.map((c) => [c.id, c.parentId]));
  const out = new Map<string, number>();
  for (const [catId, cnt] of direct) {
    const rootId = parentOf.get(catId) ?? catId;
    out.set(rootId, (out.get(rootId) ?? 0) + cnt);
  }
  return out;
}

// Сегмент после города — категория (слаг категории уникален глобально).
// Карточка товара живёт на 3-м сегменте и резолвится по id (getActiveListingById).
export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const rows = await getDb().select().from(categories).where(eq(categories.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export interface ListingFilters {
  priceMin?: number;
  priceMax?: number;
  sort?: "price_asc" | "price_desc" | "new";
  page?: number;
  pageSize?: number;
}

export interface ListingWithOwner {
  listing: Listing;
  ownerName: string | null;
  ownerUsername: string | null;
}

export const DEFAULT_PAGE_SIZE = 24;

// Активные позиции города в наборе категорий, с продавцом для карточки.
export async function getListingsForCategories(
  cityId: string,
  categoryIds: string[],
  filters: ListingFilters = {},
): Promise<{ items: ListingWithOwner[]; total: number }> {
  if (categoryIds.length === 0) return { items: [], total: 0 };
  const db = getDb();
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
  const page = Math.max(1, filters.page ?? 1);

  const conds = [
    eq(listings.cityId, cityId),
    eq(listings.status, "active"),
    inArray(listings.categoryId, categoryIds),
  ];
  if (filters.priceMin !== undefined) conds.push(gte(listings.priceDay, filters.priceMin));
  if (filters.priceMax !== undefined) conds.push(lte(listings.priceDay, filters.priceMax));
  const where = and(...conds);

  const order =
    filters.sort === "price_asc" ? asc(listings.priceDay) :
    filters.sort === "price_desc" ? desc(listings.priceDay) :
    desc(listings.createdAt);

  const [items, totalRows] = await Promise.all([
    db.select({ listing: listings, ownerName: users.name, ownerUsername: users.username })
      .from(listings)
      .innerJoin(users, eq(users.id, listings.ownerUserId))
      .where(where)
      .orderBy(order, asc(listings.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ cnt: sql<number>`count(*)::int` })
      .from(listings)
      .where(where),
  ]);

  return { items, total: totalRows[0]?.cnt ?? 0 };
}

// Текстовый поиск по позициям в пределах города: ILIKE по названию и описанию.
// Пустой запрос → пустой результат (страница показывает подсказку).
export async function searchListings(
  cityId: string,
  q: string,
  filters: ListingFilters = {},
): Promise<{ items: ListingWithOwner[]; total: number }> {
  const query = q.trim();
  if (query === "") return { items: [], total: 0 };
  const db = getDb();
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
  const page = Math.max(1, filters.page ?? 1);
  const like = `%${query}%`;

  const conds = [
    eq(listings.cityId, cityId),
    eq(listings.status, "active"),
    or(ilike(listings.title, like), ilike(listings.description, like)),
  ];
  if (filters.priceMin !== undefined) conds.push(gte(listings.priceDay, filters.priceMin));
  if (filters.priceMax !== undefined) conds.push(lte(listings.priceDay, filters.priceMax));
  const where = and(...conds);

  const order =
    filters.sort === "price_asc" ? asc(listings.priceDay) :
    filters.sort === "price_desc" ? desc(listings.priceDay) :
    desc(listings.createdAt);

  const [items, totalRows] = await Promise.all([
    db.select({ listing: listings, ownerName: users.name, ownerUsername: users.username })
      .from(listings)
      .innerJoin(users, eq(users.id, listings.ownerUserId))
      .where(where)
      .orderBy(order, asc(listings.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ cnt: sql<number>`count(*)::int` })
      .from(listings)
      .where(where),
  ]);

  return { items, total: totalRows[0]?.cnt ?? 0 };
}

export interface CategoryStats {
  listingCount: number;
  ownerCount: number;
  minPriceDay: number | null;
  maxPriceDay: number | null;
  avgDeposit: number | null;
}

// Статистика для вводного SEO-блока категории — только из данных, без шаблонных простыней.
export async function getCategoryStats(cityId: string, categoryIds: string[]): Promise<CategoryStats> {
  if (categoryIds.length === 0) {
    return { listingCount: 0, ownerCount: 0, minPriceDay: null, maxPriceDay: null, avgDeposit: null };
  }
  const rows = await getDb()
    .select({
      listingCount: sql<number>`count(*)::int`,
      ownerCount: sql<number>`count(distinct ${listings.ownerUserId})::int`,
      minPriceDay: sql<number | null>`min(${listings.priceDay})::int`,
      maxPriceDay: sql<number | null>`max(${listings.priceDay})::int`,
      avgDeposit: sql<number | null>`round(avg(${listings.depositAmount}))::int`,
    })
    .from(listings)
    .where(and(
      eq(listings.cityId, cityId),
      eq(listings.status, "active"),
      inArray(listings.categoryId, categoryIds),
    ));
  return rows[0];
}

// Активные товары продавца — для профиля /u/{username}.
export async function getActiveListingsByOwner(userId: string): Promise<Listing[]> {
  return getDb().select().from(listings)
    .where(and(eq(listings.ownerUserId, userId), eq(listings.status, "active")))
    .orderBy(desc(listings.createdAt));
}

// Карточка товара резолвится по id (из хвоста URL /{city}/{cat}/{slug}-{id}).
export async function getActiveListingById(id: string): Promise<Listing | null> {
  const rows = await getDb().select().from(listings)
    .where(and(eq(listings.id, id), eq(listings.status, "active")))
    .limit(1);
  return rows[0] ?? null;
}

export async function getCategoryById(id: string): Promise<Category | null> {
  const rows = await getDb().select().from(categories).where(eq(categories.id, id)).limit(1);
  return rows[0] ?? null;
}

// Все активные позиции с полным путём слагов — для sitemap.
// URL: /{citySlug}/{categorySlug}/{listingSlug}-{listingId}/.
export async function getAllActiveListingPaths(): Promise<
  Array<{ citySlug: string; categorySlug: string; listingSlug: string; listingId: string; updatedAt: Date }>
> {
  return getDb()
    .select({
      citySlug: cities.slug,
      categorySlug: categories.slug,
      listingSlug: listings.slug,
      listingId: listings.id,
      updatedAt: listings.updatedAt,
    })
    .from(listings)
    .innerJoin(cities, and(eq(cities.id, listings.cityId), eq(cities.isActive, true)))
    .innerJoin(categories, eq(categories.id, listings.categoryId))
    .where(eq(listings.status, "active"));
}

export interface AvailabilityRow {
  listingId: string;
  date: string;
  bookedQty: number;
  blockedQty: number;
}

// Занятость набора позиций на диапазон дат (для мини-календарей листинга — одним запросом).
export async function getAvailabilityRows(
  listingIds: string[],
  dateFrom: string,
  dateTo: string,
): Promise<AvailabilityRow[]> {
  if (listingIds.length === 0) return [];
  return getDb()
    .select({
      listingId: availability.listingId,
      date: availability.date,
      bookedQty: availability.bookedQty,
      blockedQty: availability.blockedQty,
    })
    .from(availability)
    .where(and(
      inArray(availability.listingId, listingIds),
      gte(availability.date, dateFrom),
      lte(availability.date, dateTo),
    ));
}
