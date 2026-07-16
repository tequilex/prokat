"use server";

// Server actions кабинета владельца: прокат, позиции, решения по заявкам,
// ручное закрытие дат.
//
// Инварианты (см. lib/catalog/booking-status):
// - подтверждение заявки увеличивает bookedQty на диапазон в ТОЙ ЖЕ транзакции,
//   что и смена статуса; перед этим занятость перепроверяется под блокировкой;
// - completed/no_show дат не освобождают; отмена confirmed — освобождает
//   (реализована в cancelBookingRequest, здесь не дублируется);
// - blocked_qty — ручные закрытия владельцем, не пересекается с booked_qty.

import { and, eq, gte, lte, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import {
  availability, bookingRequests, categories, events, listings, providers,
} from "@db/schema";
import { auth } from "@/lib/auth";
import { newId } from "@/lib/id";
import { slugify } from "@/lib/slugify";
import {
  listingFormSchema, providerFormSchema, RESERVED_SLUGS,
} from "@/lib/owner/validation";
import {
  unavailableDates, eachDate, type AvailabilityMap,
} from "@/lib/catalog/availability";
import { canTransition, type BookingStatus } from "@/lib/catalog/booking-status";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function requireOwner() {
  const session = await auth();
  if (!session?.user?.id || session.user.bannedAt) return null;
  const rows = await getDb().select().from(providers)
    .where(eq(providers.ownerUserId, session.user.id))
    .limit(1);
  return { userId: session.user.id, provider: rows[0] ?? null };
}

// ============================== Прокат ==============================

export async function createProvider(input: unknown): Promise<ActionResult<{ slug: string }>> {
  const session = await auth();
  if (!session?.user?.id || session.user.bannedAt) return { ok: false, error: "auth_required" };

  const parsed = providerFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid_input" };
  const form = parsed.data;

  const db = getDb();
  const existing = await db.select({ id: providers.id }).from(providers)
    .where(eq(providers.ownerUserId, session.user.id)).limit(1);
  if (existing.length > 0) return { ok: false, error: "already_has_provider" };

  // Слаг не должен конфликтовать с категориями (category-first резолвинг URL),
  // зарезервированными путями и прокатами этого города.
  const base = slugify(form.name);
  if (!base) return { ok: false, error: "Название должно содержать буквы или цифры" };
  const catSlugs = new Set((await db.select({ slug: categories.slug }).from(categories)).map((c) => c.slug));
  let slug = base;
  for (let i = 2; i <= 50; i++) {
    const taken =
      RESERVED_SLUGS.has(slug) || catSlugs.has(slug) ||
      (await db.select({ id: providers.id }).from(providers)
        .where(and(eq(providers.cityId, form.cityId), eq(providers.slug, slug)))
        .limit(1)).length > 0;
    if (!taken) break;
    slug = `${base}-${i}`;
    if (i === 50) return { ok: false, error: "slug_collision" };
  }

  await db.insert(providers).values({
    id: newId(),
    ownerUserId: session.user.id,
    cityId: form.cityId,
    name: form.name,
    slug,
    description: form.description || null,
    address: form.address || null,
    phones: form.phones,
    workHoursJson: form.workHours ? { text: form.workHours } : null,
  });

  revalidatePath("/cabinet");
  return { ok: true, data: { slug } };
}

export async function updateProvider(input: unknown): Promise<ActionResult> {
  const owner = await requireOwner();
  if (!owner?.provider) return { ok: false, error: "no_provider" };

  const parsed = providerFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid_input" };
  const form = parsed.data;

  // Город и слаг после создания не меняются (v1): слаг — часть публичного URL.
  await getDb().update(providers)
    .set({
      name: form.name,
      description: form.description || null,
      address: form.address || null,
      phones: form.phones,
      workHoursJson: form.workHours ? { text: form.workHours } : null,
    })
    .where(eq(providers.id, owner.provider.id));

  revalidatePath("/cabinet/settings");
  return { ok: true, data: undefined };
}

// ============================== Позиции ==============================

async function uniqueListingSlug(providerId: string, title: string): Promise<string | null> {
  const db = getDb();
  const base = slugify(title);
  if (!base) return null;
  for (let i = 1; i <= 50; i++) {
    const candidate = i === 1 ? base : `${base}-${i}`;
    const taken = (await db.select({ id: listings.id }).from(listings)
      .where(and(eq(listings.providerId, providerId), eq(listings.slug, candidate)))
      .limit(1)).length > 0;
    if (!taken) return candidate;
  }
  return null;
}

export async function createListing(input: unknown): Promise<ActionResult<{ listingId: string }>> {
  const owner = await requireOwner();
  if (!owner?.provider) return { ok: false, error: "no_provider" };

  const parsed = listingFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid_input" };
  const form = parsed.data;

  const slug = await uniqueListingSlug(owner.provider.id, form.title);
  if (!slug) return { ok: false, error: "Название должно содержать буквы или цифры" };

  const id = newId();
  // v1 без премодерации (админка — следующий этап): позиция сразу active.
  await getDb().insert(listings).values({
    id,
    providerId: owner.provider.id,
    categoryId: form.categoryId,
    title: form.title,
    slug,
    description: form.description || null,
    priceDay: form.priceDay,
    priceHour: form.priceHour,
    priceWeek: form.priceWeek,
    depositAmount: form.depositType === "money" ? form.depositAmount : null,
    depositType: form.depositType,
    quantity: form.quantity,
    photosJson: form.photos,
    status: "active",
  });

  revalidatePath("/cabinet/listings");
  return { ok: true, data: { listingId: id } };
}

export async function updateListing(listingId: string, input: unknown): Promise<ActionResult> {
  const owner = await requireOwner();
  if (!owner?.provider) return { ok: false, error: "no_provider" };

  const parsed = listingFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid_input" };
  const form = parsed.data;

  const res = await getDb().update(listings)
    .set({
      categoryId: form.categoryId,
      title: form.title, // слаг сохраняем: URL позиции не должен ломаться
      description: form.description || null,
      priceDay: form.priceDay,
      priceHour: form.priceHour,
      priceWeek: form.priceWeek,
      depositAmount: form.depositType === "money" ? form.depositAmount : null,
      depositType: form.depositType,
      quantity: form.quantity,
      photosJson: form.photos,
      updatedAt: new Date(),
    })
    .where(and(eq(listings.id, listingId), eq(listings.providerId, owner.provider.id)))
    .returning({ id: listings.id });
  if (res.length === 0) return { ok: false, error: "not_found" };

  revalidatePath("/cabinet/listings");
  return { ok: true, data: undefined };
}

export async function setListingStatus(
  listingId: string,
  status: "active" | "hidden" | "archived",
): Promise<ActionResult> {
  const owner = await requireOwner();
  if (!owner?.provider) return { ok: false, error: "no_provider" };

  const res = await getDb().update(listings)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(listings.id, listingId), eq(listings.providerId, owner.provider.id)))
    .returning({ id: listings.id });
  if (res.length === 0) return { ok: false, error: "not_found" };

  revalidatePath("/cabinet/listings");
  return { ok: true, data: undefined };
}

// ============================== Заявки ==============================

async function transitionRequest(
  requestId: string,
  to: BookingStatus,
  providerComment?: string,
): Promise<ActionResult> {
  const owner = await requireOwner();
  if (!owner?.provider) return { ok: false, error: "no_provider" };
  const providerId = owner.provider.id;

  const db = getDb();
  try {
    await db.transaction(async (tx) => {
      const rows = await tx.select().from(bookingRequests)
        .where(eq(bookingRequests.id, requestId))
        .for("update")
        .limit(1);
      const req = rows[0];
      if (!req || req.providerId !== providerId) throw new Error("not_found");
      if (!canTransition(req.status, to)) throw new Error("bad_status");

      if (to === "confirmed") {
        // Лочим листинг (source of truth по quantity) и перепроверяем занятость.
        const lrows = await tx.select().from(listings)
          .where(eq(listings.id, req.listingId)).for("update").limit(1);
        const listing = lrows[0];
        if (!listing) throw new Error("not_found");

        const availRows = await tx.select().from(availability)
          .where(and(
            eq(availability.listingId, req.listingId),
            gte(availability.date, req.dateFrom),
            lte(availability.date, req.dateTo),
          ))
          .for("update");
        const map: AvailabilityMap = new Map(
          availRows.map((r) => [r.date, { bookedQty: r.bookedQty, blockedQty: r.blockedQty }]),
        );
        const busy = unavailableDates(listing.quantity, map, req.dateFrom, req.dateTo, req.qty);
        if (busy.length > 0) throw new Error(`dates_taken:${busy.join(",")}`);

        for (const date of eachDate(req.dateFrom, req.dateTo)) {
          await tx.insert(availability)
            .values({ listingId: req.listingId, date, bookedQty: req.qty })
            .onConflictDoUpdate({
              target: [availability.listingId, availability.date],
              set: { bookedQty: sql`${availability.bookedQty} + ${req.qty}` },
            });
        }
      }

      await tx.update(bookingRequests)
        .set({
          status: to,
          respondedAt: new Date(),
          ...(providerComment !== undefined ? { providerComment: providerComment || null } : {}),
        })
        .where(eq(bookingRequests.id, requestId));

      await tx.insert(events).values({
        id: newId(),
        entityType: "booking_request",
        entityId: requestId,
        event: `request_${to}`,
        userId: owner.userId,
        metaJson: { fromStatus: req.status },
      });
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    if (msg === "not_found" || msg === "bad_status" || msg.startsWith("dates_taken:")) {
      return { ok: false, error: msg };
    }
    throw e;
  }

  revalidatePath("/cabinet/requests");
  revalidatePath("/requests");
  return { ok: true, data: undefined };
}

export async function confirmRequest(requestId: string, comment?: string): Promise<ActionResult> {
  return transitionRequest(requestId, "confirmed", comment);
}
export async function declineRequest(requestId: string, comment?: string): Promise<ActionResult> {
  return transitionRequest(requestId, "declined", comment);
}
export async function completeRequest(requestId: string): Promise<ActionResult> {
  return transitionRequest(requestId, "completed");
}
export async function noShowRequest(requestId: string): Promise<ActionResult> {
  return transitionRequest(requestId, "no_show");
}

// ============================== Календарь ==============================

// Ручное закрытие дат («сдал по телефону», «в ремонте»): выставляет blocked_qty
// на диапазон. qty=0 открывает даты обратно. Клампится к quantity позиции.
export async function setBlockedDates(
  listingId: string,
  dateFrom: string,
  dateTo: string,
  blockedQty: number,
): Promise<ActionResult> {
  const owner = await requireOwner();
  if (!owner?.provider) return { ok: false, error: "no_provider" };

  if (!Number.isInteger(blockedQty) || blockedQty < 0) return { ok: false, error: "bad_qty" };

  const db = getDb();
  const lrows = await db.select().from(listings)
    .where(and(eq(listings.id, listingId), eq(listings.providerId, owner.provider.id)))
    .limit(1);
  const listing = lrows[0];
  if (!listing) return { ok: false, error: "not_found" };

  let dates: string[];
  try { dates = eachDate(dateFrom, dateTo); } catch { return { ok: false, error: "bad_dates" }; }
  if (dates.length > 366) return { ok: false, error: "range_too_long" };

  const qty = Math.min(blockedQty, listing.quantity);
  await db.transaction(async (tx) => {
    for (const date of dates) {
      await tx.insert(availability)
        .values({ listingId, date, blockedQty: qty })
        .onConflictDoUpdate({
          target: [availability.listingId, availability.date],
          set: { blockedQty: qty },
        });
    }
  });

  revalidatePath("/cabinet/calendar");
  return { ok: true, data: undefined };
}
