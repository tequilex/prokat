// Read-слой кабинета владельца. Роль «владелец» = наличие провайдера
// с owner_user_id = текущий user (v1: один прокат на пользователя).

import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  bookingRequests, cities, events, listings, providers, users,
} from "@db/schema";
import { expireStaleRequests } from "@/server/actions/booking";
import type { Provider } from "@/server/catalog";

export async function getOwnerProvider(userId: string): Promise<Provider | null> {
  const rows = await getDb().select().from(providers)
    .where(eq(providers.ownerUserId, userId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getProviderCity(cityId: string) {
  const rows = await getDb().select().from(cities).where(eq(cities.id, cityId)).limit(1);
  return rows[0] ?? null;
}

// Заявки проката: новые сверху (критический путь владельца), затем по свежести.
export async function getProviderRequests(providerId: string) {
  await expireStaleRequests();
  return getDb()
    .select({
      request: bookingRequests,
      listingTitle: listings.title,
      customerName: users.name,
      customerUsername: users.username,
    })
    .from(bookingRequests)
    .innerJoin(listings, eq(listings.id, bookingRequests.listingId))
    .innerJoin(users, eq(users.id, bookingRequests.customerUserId))
    .where(eq(bookingRequests.providerId, providerId))
    .orderBy(
      sql`CASE WHEN ${bookingRequests.status} = 'new' THEN 0 ELSE 1 END`,
      desc(bookingRequests.createdAt),
    );
}

export async function countNewRequests(providerId: string): Promise<number> {
  await expireStaleRequests();
  const rows = await getDb()
    .select({ cnt: sql<number>`count(*)::int` })
    .from(bookingRequests)
    .where(and(
      eq(bookingRequests.providerId, providerId),
      eq(bookingRequests.status, "new"),
    ));
  return rows[0]?.cnt ?? 0;
}

// Все позиции проката (включая скрытые/архив) для кабинета.
export async function getOwnerListings(providerId: string) {
  return getDb().select().from(listings)
    .where(eq(listings.providerId, providerId))
    .orderBy(desc(listings.createdAt));
}

export async function getOwnerListing(providerId: string, listingId: string) {
  const rows = await getDb().select().from(listings)
    .where(and(eq(listings.id, listingId), eq(listings.providerId, providerId)))
    .limit(1);
  return rows[0] ?? null;
}

export interface ListingStats {
  listingId: string;
  title: string;
  views30d: number;
  requests30d: number;
}

// Статистика из events: просмотры и заявки по позициям за 30 дней.
export async function getProviderStats(providerId: string): Promise<ListingStats[]> {
  const db = getDb();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [own, views, reqs] = await Promise.all([
    db.select({ id: listings.id, title: listings.title }).from(listings)
      .where(eq(listings.providerId, providerId)),
    db.select({ entityId: events.entityId, cnt: count() }).from(events)
      .where(and(
        eq(events.entityType, "listing"),
        eq(events.event, "view_listing"),
        gte(events.createdAt, since),
      ))
      .groupBy(events.entityId),
    db.select({ listingId: bookingRequests.listingId, cnt: count() }).from(bookingRequests)
      .where(and(
        eq(bookingRequests.providerId, providerId),
        gte(bookingRequests.createdAt, since),
      ))
      .groupBy(bookingRequests.listingId),
  ]);

  const viewsMap = new Map(views.map((v) => [v.entityId, Number(v.cnt)]));
  const reqsMap = new Map(reqs.map((r) => [r.listingId, Number(r.cnt)]));
  return own.map((l) => ({
    listingId: l.id,
    title: l.title,
    views30d: viewsMap.get(l.id) ?? 0,
    requests30d: reqsMap.get(l.id) ?? 0,
  }));
}
