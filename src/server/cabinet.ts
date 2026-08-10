// Сводка кабинета: одна страница вместо обхода пяти разделов.

import { and, asc, desc, eq, gt, gte, inArray, lte, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb } from "@/lib/db";
import { availability, bookingRequests, categories, cities, events, listings, users } from "@db/schema";
import { expireStaleRequests } from "@/server/actions/booking";
import { todayStr, addDaysStr } from "@/lib/catalog/dates";

export interface CabinetDeal {
  id: string;
  listingId: string;
  listingTitle: string;
  listingSlug: string;
  citySlug: string;
  categorySlug: string;
  dateFrom: string;
  dateTo: string;
  qty: number;
  expiresAt: Date;
  peerName: string | null;
  peerUsername: string | null;
}

export interface CabinetSummary {
  /** Заявки, которые ждут решения владельца: у каждой горит свой срок. */
  pending: CabinetDeal[];
  /** Подтверждённые аренды: моя вещь уехала к арендатору. */
  lending: CabinetDeal[];
  /** Подтверждённые аренды, где арендатор — я. */
  borrowing: CabinetDeal[];
  stats: {
    views7d: number;
    requests30d: number;
    activeListings: number;
    busyDays30d: number;
  };
}

export async function getCabinetSummary(userId: string): Promise<CabinetSummary> {
  // Читаем после протухания: заявка с истёкшим сроком не должна висеть
  // в «требует действия».
  await expireStaleRequests();

  const db = getDb();
  const today = todayStr();
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const myListings = db
    .select({ id: listings.id })
    .from(listings)
    .where(eq(listings.ownerUserId, userId));

  const [pending, lending, borrowing, views, requests, active, busy] = await Promise.all([
    deals(userId, "owner", "new"),
    deals(userId, "owner", "confirmed"),
    deals(userId, "customer", "confirmed"),

    db
      .select({ cnt: sql<number>`count(*)::int` })
      .from(events)
      .where(and(
        eq(events.event, "view_listing"),
        gte(events.createdAt, weekAgo),
        inArray(events.entityId, myListings),
      )),

    db
      .select({ cnt: sql<number>`count(*)::int` })
      .from(bookingRequests)
      .where(and(
        eq(bookingRequests.ownerUserId, userId),
        gte(bookingRequests.createdAt, monthAgo),
      )),

    db
      .select({ cnt: sql<number>`count(*)::int` })
      .from(listings)
      .where(and(eq(listings.ownerUserId, userId), eq(listings.status, "active"))),

    // Занятость на месяц вперёд: сколько дней хотя бы одна вещь в работе.
    db
      .select({ cnt: sql<number>`count(distinct ${availability.date})::int` })
      .from(availability)
      .where(and(
        inArray(availability.listingId, myListings),
        gte(availability.date, today),
        lte(availability.date, addDaysStr(today, 30)),
        gt(availability.bookedQty, 0),
      )),
  ]);

  return {
    pending,
    lending,
    borrowing,
    stats: {
      views7d: views[0]?.cnt ?? 0,
      requests30d: requests[0]?.cnt ?? 0,
      activeListings: active[0]?.cnt ?? 0,
      busyDays30d: busy[0]?.cnt ?? 0,
    },
  };
}

/* Заявки одной стороны сделки вместе с вещью и вторым участником: карточка
 * сводки отвечает «что, когда и с кем» без дополнительных запросов.
 *
 * Ожидающие решения сортируются по сроку — первым то, что сгорит раньше;
 * подтверждённые — по дате начала. */
async function deals(
  userId: string,
  side: "owner" | "customer",
  status: "new" | "confirmed",
): Promise<CabinetDeal[]> {
  const peer = alias(users, "peer");
  const mineColumn = side === "owner" ? bookingRequests.ownerUserId : bookingRequests.customerUserId;
  const peerColumn = side === "owner" ? bookingRequests.customerUserId : bookingRequests.ownerUserId;

  return getDb()
    .select({
      id: bookingRequests.id,
      listingId: bookingRequests.listingId,
      listingTitle: listings.title,
      listingSlug: listings.slug,
      citySlug: cities.slug,
      categorySlug: categories.slug,
      dateFrom: bookingRequests.dateFrom,
      dateTo: bookingRequests.dateTo,
      qty: bookingRequests.qty,
      expiresAt: bookingRequests.expiresAt,
      peerName: peer.name,
      peerUsername: peer.username,
    })
    .from(bookingRequests)
    .innerJoin(listings, eq(listings.id, bookingRequests.listingId))
    .innerJoin(cities, eq(cities.id, listings.cityId))
    .innerJoin(categories, eq(categories.id, listings.categoryId))
    .innerJoin(peer, eq(peer.id, peerColumn))
    .where(and(eq(mineColumn, userId), eq(bookingRequests.status, status)))
    .orderBy(status === "new" ? asc(bookingRequests.expiresAt) : asc(bookingRequests.dateFrom))
    .limit(5);
}
