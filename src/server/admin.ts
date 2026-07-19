// Read-слой админки. Доступ проверяют страницы (assertAdmin).

import { count, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  bookingRequests, categories, cities, listings, providers, users,
} from "@db/schema";

export async function adminListProviders() {
  const db = getDb();
  return db
    .select({
      provider: providers,
      cityName: cities.name,
      citySlug: cities.slug,
      ownerEmail: users.email,
      listingCount: sql<number>`(SELECT count(*)::int FROM ${listings} WHERE ${listings.providerId} = ${providers.id})`,
    })
    .from(providers)
    .innerJoin(cities, eq(cities.id, providers.cityId))
    .innerJoin(users, eq(users.id, providers.ownerUserId))
    .orderBy(desc(providers.createdAt));
}

export async function adminListListings(limit = 200) {
  return getDb()
    .select({
      listing: listings,
      providerName: providers.name,
      providerSlug: providers.slug,
      citySlug: cities.slug,
    })
    .from(listings)
    .innerJoin(providers, eq(providers.id, listings.providerId))
    .innerJoin(cities, eq(cities.id, providers.cityId))
    .orderBy(desc(listings.createdAt))
    .limit(limit);
}

export async function adminListCities() {
  return getDb()
    .select({
      city: cities,
      providerCount: sql<number>`(SELECT count(*)::int FROM ${providers} WHERE ${providers.cityId} = ${cities.id})`,
    })
    .from(cities)
    .orderBy(cities.name);
}

export async function adminListCategories() {
  return getDb()
    .select({
      category: categories,
      listingCount: sql<number>`(SELECT count(*)::int FROM ${listings} WHERE ${listings.categoryId} = ${categories.id})`,
      childCount: sql<number>`(SELECT count(*)::int FROM ${categories} AS c2 WHERE c2.parent_id = ${categories.id})`,
    })
    .from(categories)
    .orderBy(categories.name);
}

export async function adminListRequests(limit = 100) {
  return getDb()
    .select({
      request: bookingRequests,
      listingTitle: listings.title,
      providerName: providers.name,
      customerEmail: users.email,
    })
    .from(bookingRequests)
    .innerJoin(listings, eq(listings.id, bookingRequests.listingId))
    .innerJoin(providers, eq(providers.id, bookingRequests.providerId))
    .innerJoin(users, eq(users.id, bookingRequests.customerUserId))
    .orderBy(desc(bookingRequests.createdAt))
    .limit(limit);
}

export async function adminListUsers(limit = 200) {
  const db = getDb();
  return db
    .select({
      user: users,
      requestCount: sql<number>`(SELECT count(*)::int FROM ${bookingRequests} WHERE ${bookingRequests.customerUserId} = ${users.id})`,
    })
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(limit);
}

export async function adminCounts() {
  const db = getDb();
  const [p, l, r, u] = await Promise.all([
    db.select({ c: count() }).from(providers),
    db.select({ c: count() }).from(listings),
    db.select({ c: count() }).from(bookingRequests),
    db.select({ c: count() }).from(users),
  ]);
  return {
    providers: Number(p[0].c),
    listings: Number(l[0].c),
    requests: Number(r[0].c),
    users: Number(u[0].c),
  };
}
