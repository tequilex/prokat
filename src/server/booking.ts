// Read-запросы флоу заявок (не server actions — обычные серверные функции).

import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { bookingRequests, categories, cities, listings, users } from "@db/schema";
import { expireStaleRequests } from "@/server/actions/booking";

export type CustomerRequestRow = Awaited<ReturnType<typeof getCustomerRequests>>[number];

// Заявки покупателя для /requests. Протухание — лениво, перед чтением.
// Продавец берётся по денормализованному bookingRequests.ownerUserId; телефон
// продавца раскрывается на странице после подтверждения заявки.
export async function getCustomerRequests(userId: string) {
  await expireStaleRequests();
  return getDb()
    .select({
      request: bookingRequests,
      listingTitle: listings.title,
      listingSlug: listings.slug,
      listingId: listings.id,
      categorySlug: categories.slug,
      citySlug: cities.slug,
      ownerName: users.name,
      ownerPhone: users.phone,
    })
    .from(bookingRequests)
    .innerJoin(listings, eq(listings.id, bookingRequests.listingId))
    .innerJoin(users, eq(users.id, bookingRequests.ownerUserId))
    .innerJoin(cities, eq(cities.id, listings.cityId))
    .innerJoin(categories, eq(categories.id, listings.categoryId))
    .where(eq(bookingRequests.customerUserId, userId))
    .orderBy(desc(bookingRequests.createdAt));
}

// Телефон пользователя для предзаполнения формы заявки.
export async function getUserPhone(userId: string): Promise<string | null> {
  const rows = await getDb().select({ phone: users.phone }).from(users)
    .where(eq(users.id, userId)).limit(1);
  return rows[0]?.phone ?? null;
}
