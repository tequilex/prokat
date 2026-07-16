// Read-запросы флоу заявок (не server actions — обычные серверные функции).

import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { bookingRequests, cities, listings, providers, users } from "@db/schema";
import { expireStaleRequests } from "@/server/actions/booking";

export type CustomerRequestRow = Awaited<ReturnType<typeof getCustomerRequests>>[number];

// Заявки покупателя для /requests. Протухание — лениво, перед чтением.
export async function getCustomerRequests(userId: string) {
  await expireStaleRequests();
  return getDb()
    .select({
      request: bookingRequests,
      listingTitle: listings.title,
      listingSlug: listings.slug,
      providerName: providers.name,
      providerSlug: providers.slug,
      providerPhones: providers.phones,
      citySlug: cities.slug,
    })
    .from(bookingRequests)
    .innerJoin(listings, eq(listings.id, bookingRequests.listingId))
    .innerJoin(providers, eq(providers.id, bookingRequests.providerId))
    .innerJoin(cities, eq(cities.id, providers.cityId))
    .where(eq(bookingRequests.customerUserId, userId))
    .orderBy(desc(bookingRequests.createdAt));
}

// Телефон пользователя для предзаполнения формы заявки.
export async function getUserPhone(userId: string): Promise<string | null> {
  const rows = await getDb().select({ phone: users.phone }).from(users)
    .where(eq(users.id, userId)).limit(1);
  return rows[0]?.phone ?? null;
}
