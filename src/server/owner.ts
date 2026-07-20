// Read-слой кабинета. Любой залогиненный юзер размещает товары и получает
// заявки на них; отдельной роли/сущности «владелец» нет.

import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { bookingRequests, listings, users } from "@db/schema";
import { expireStaleRequests } from "@/server/actions/booking";

// Заявки на товары юзера: новые сверху (критический путь), затем по свежести.
export async function getOwnerRequests(userId: string) {
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
    .where(eq(bookingRequests.ownerUserId, userId))
    .orderBy(
      sql`CASE WHEN ${bookingRequests.status} = 'new' THEN 0 ELSE 1 END`,
      desc(bookingRequests.createdAt),
    );
}

export async function countNewRequests(userId: string): Promise<number> {
  await expireStaleRequests();
  const rows = await getDb()
    .select({ cnt: sql<number>`count(*)::int` })
    .from(bookingRequests)
    .where(and(
      eq(bookingRequests.ownerUserId, userId),
      eq(bookingRequests.status, "new"),
    ));
  return rows[0]?.cnt ?? 0;
}

// Все товары юзера (включая скрытые/архив) для кабинета.
export async function getOwnerListings(userId: string) {
  return getDb().select().from(listings)
    .where(eq(listings.ownerUserId, userId))
    .orderBy(desc(listings.createdAt));
}

export async function getOwnerListing(userId: string, listingId: string) {
  const rows = await getDb().select().from(listings)
    .where(and(eq(listings.id, listingId), eq(listings.ownerUserId, userId)))
    .limit(1);
  return rows[0] ?? null;
}
