// Data layer публичного каталога. Только чтение, только активные сущности.
// Все функции принимают уже разрезолвленные id (страницы резолвят слаги сами).

import {
  and, asc, desc, eq, gte, inArray, lte, sql,
} from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  availability, categories, cities, listings, providers,
} from "@db/schema";

export type City = typeof cities.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Provider = typeof providers.$inferSelect;
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
    .innerJoin(providers, eq(providers.id, listings.providerId))
    .where(and(eq(providers.cityId, cityId), eq(listings.status, "active")))
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

// Сегмент после города: категория (глобальный слаг) или прокат (слаг в городе).
// Категория приоритетна — их слаги задаёт админ и они «зарезервированы».
export type CitySegment =
  | { kind: "category"; category: Category }
  | { kind: "provider"; provider: Provider };

export async function resolveCitySegment(cityId: string, slug: string): Promise<CitySegment | null> {
  const db = getDb();
  const cat = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  if (cat[0]) return { kind: "category", category: cat[0] };
  const prov = await db.select().from(providers)
    .where(and(eq(providers.cityId, cityId), eq(providers.slug, slug)))
    .limit(1);
  if (prov[0]) return { kind: "provider", provider: prov[0] };
  return null;
}

export interface ListingFilters {
  priceMin?: number;
  priceMax?: number;
  sort?: "price_asc" | "price_desc" | "new";
  page?: number;
  pageSize?: number;
}

export interface ListingWithProvider {
  listing: Listing;
  providerName: string;
  providerSlug: string;
}

export const DEFAULT_PAGE_SIZE = 24;

// Активные позиции города в наборе категорий, с провайдером для карточки.
export async function getListingsForCategories(
  cityId: string,
  categoryIds: string[],
  filters: ListingFilters = {},
): Promise<{ items: ListingWithProvider[]; total: number }> {
  if (categoryIds.length === 0) return { items: [], total: 0 };
  const db = getDb();
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
  const page = Math.max(1, filters.page ?? 1);

  const conds = [
    eq(providers.cityId, cityId),
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
    db.select({ listing: listings, providerName: providers.name, providerSlug: providers.slug })
      .from(listings)
      .innerJoin(providers, eq(providers.id, listings.providerId))
      .where(where)
      .orderBy(order, asc(listings.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ cnt: sql<number>`count(*)::int` })
      .from(listings)
      .innerJoin(providers, eq(providers.id, listings.providerId))
      .where(where),
  ]);

  return { items, total: totalRows[0]?.cnt ?? 0 };
}

export interface CategoryStats {
  listingCount: number;
  providerCount: number;
  minPriceDay: number | null;
  maxPriceDay: number | null;
  avgDeposit: number | null;
}

// Статистика для вводного SEO-блока категории — только из данных, без шаблонных простыней.
export async function getCategoryStats(cityId: string, categoryIds: string[]): Promise<CategoryStats> {
  if (categoryIds.length === 0) {
    return { listingCount: 0, providerCount: 0, minPriceDay: null, maxPriceDay: null, avgDeposit: null };
  }
  const rows = await getDb()
    .select({
      listingCount: sql<number>`count(*)::int`,
      providerCount: sql<number>`count(distinct ${listings.providerId})::int`,
      minPriceDay: sql<number | null>`min(${listings.priceDay})::int`,
      maxPriceDay: sql<number | null>`max(${listings.priceDay})::int`,
      avgDeposit: sql<number | null>`round(avg(${listings.depositAmount}))::int`,
    })
    .from(listings)
    .innerJoin(providers, eq(providers.id, listings.providerId))
    .where(and(
      eq(providers.cityId, cityId),
      eq(listings.status, "active"),
      inArray(listings.categoryId, categoryIds),
    ));
  return rows[0];
}

export async function getProvidersOfCity(cityId: string): Promise<Provider[]> {
  return getDb().select().from(providers)
    .where(eq(providers.cityId, cityId))
    .orderBy(asc(providers.name));
}

export async function getProviderListings(providerId: string): Promise<Listing[]> {
  return getDb().select().from(listings)
    .where(and(eq(listings.providerId, providerId), eq(listings.status, "active")))
    .orderBy(asc(listings.title));
}

export async function getListingBySlug(providerId: string, slug: string): Promise<Listing | null> {
  const rows = await getDb().select().from(listings)
    .where(and(
      eq(listings.providerId, providerId),
      eq(listings.slug, slug),
      eq(listings.status, "active"),
    ))
    .limit(1);
  return rows[0] ?? null;
}

export async function getCategoryById(id: string): Promise<Category | null> {
  const rows = await getDb().select().from(categories).where(eq(categories.id, id)).limit(1);
  return rows[0] ?? null;
}

// Все активные позиции с полным путём слагов — для sitemap.
export async function getAllActiveListingPaths(): Promise<
  Array<{ citySlug: string; providerSlug: string; listingSlug: string; updatedAt: Date }>
> {
  return getDb()
    .select({
      citySlug: cities.slug,
      providerSlug: providers.slug,
      listingSlug: listings.slug,
      updatedAt: listings.updatedAt,
    })
    .from(listings)
    .innerJoin(providers, eq(providers.id, listings.providerId))
    .innerJoin(cities, and(eq(cities.id, providers.cityId), eq(cities.isActive, true)))
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
